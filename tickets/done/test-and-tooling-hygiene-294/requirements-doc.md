# Requirements Document — test-and-tooling-hygiene-294

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `test-and-tooling-hygiene-294`
- Request / ticket: Project Task `autobyteus-294` (description and all comments up to 2026-10-27, read with `get_project_task` on 2026-10-27)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-27
- Approved by and reference: `User`; reference: the user's message in this conversation, 2026-10-27: "Okay, go ahead … you found like a still broken and still fixing, still worth fixing … Go ahead. Regarding the live compaction … we don't have to test that … if it's unit test, then it's possible, but if it's a real test, it will fail … maybe you can write that into the testing MD … maybe that's a global thing", answering the Solution Designer's proposal (fix what is still broken; drop the worker E2E and the optional diagnostics; leave Rule 9 out).
- Exact approved requirements baseline / solution revision: this document at `SR-005` (SR-002 scope; SR-004 wording of REQ-031; SR-005 adds REQ-032, approved by the user's "yesss go ahead", 2026-10-27, to the question "Shall I fix these four bugs here?")
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: checks that every ticket runs or should run are red, flaky, silently skipped or missing on `origin/personal`: the server architecture suite, a web store spec, a server E2E, the live-compaction unit tests, three gated runtime E2E files, two web browser probes, an intermittent running-agents case; the web has no type check (507 errors today); dead code and stale tooling remain (unregistered agent-management tools, 65 never-run compiled tests, a test-only Claude seam, gateway packaging scripts for a removed feature); icon-only buttons render nothing.
- Affected actors or systems: every ticket's implementation, validation and delivery roles (they meet these failures); the user (invisible buttons; noisy server log; trust in green checks).
- Desired outcome: the checks named in TESTING.md are green and deterministic, every failing or flaky case has a found cause and a fix (or a reported product item with its cause), the web type check is a gate that cannot grow, and the listed dead code is gone without behaviour change.
- Observable definition of success: the acceptance criteria below pass from a clean clone of the finalized branch; merged to `personal`.

## Relevant Current And Desired Behavior

Item IDs `H-*` map each Task item (source in brackets) to its behaviour. Evidence IDs refer to `investigation-notes.md` and `evidence/`.

| Behavior ID | Kind | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 (H-01) [260 FU-008, 185 FU-010, 290 FU-004] | Contract | `application-framework-boundaries.test.ts` fails 2 assertions: tool units lack `agent_runtimes`; SR-011 getter list lacks `internal-agent-visibility.ts`; `tests/architecture` runs in no package script (SD-01, SD-06) | both lists match the source; the architecture suite runs in the green server suite | every other architecture assertion |
| BEH-002 (H-02) [244 FU-008] | User / Contract | creating or editing an Agent publishes a cache row without `internal`, so the catalog query cannot be read from cache (Apollo missing-field error); spec fixture also lacks `internal` (SD-02) | create/update return `internal`; the catalog stays readable from cache; spec 10/10 | Org definition behaviour; the query's fields |
| BEH-003 (H-03) [244 FU-009] | Contract | archive E2E 4/6 fail: its mock lacks `getAgentDefinitionsWithTeamLocal` (SD-03) | 6/6 with the real service's method shape | the E2E's assertions |
| BEH-004 (H-04) [185 FU-011] | Operational | the shared live-E2E harness builds the native backend without the native command scope; 3 unit tests (and the live runs) throw `Native command host scope is required` (SD-07) | the harness owns and closes a native command scope per scenario; tests reach their asserted errors | the tests' assertions; no provider calls in the unit tests |
| BEH-005 (H-05) [185 FU-006] | Operational | `tests/agent-work-journal` (6 files) runs in no package script (SD-08) | it runs in the green server suite; its perf file stays behind its gate | — |
| BEH-006 (H-06) [user decision, 308 FU-001] | Contract | five agent-management and five agent-team-management tools and two registration modules exist; registered nowhere since `eef765b901` (2026-03-03) | removed with their tests and doc mentions | the app's GraphQL agent and team definition management; UI labels |
| BEH-007 (H-07) [253 FU-001] | Operational | no web type check; vue-tsc reports 507 on `2f48d85d4d` (scope includes server `src`, `electron/`, `build/`); undeclared Apollo/graphql imports; 4 dead components with broken imports (SD-10, SD-12) | a `typecheck` script that passes: production web code has zero errors; test-file errors are listed in a baseline that may only shrink; Electron and build projects checked by their own configs; described in TESTING.md and run by the desktop build | runtime behaviour of every fixed file |
| BEH-008 (H-08) [260 FU-001] | Operational | `generated/graphql.ts` is current today (0 lines drift, SD-13) but can only be regenerated against a running server; it imports Vue 2's `@vue/composition-api` | **Withdrawn from this ticket by the user (DEC-024)**; follow-up FU-005 | the generated types used today |
| BEH-009 (H-09) [253 FU-002, 259 FU-003, 14, 260 FU-002] | Contract | DLC E2E 2/3 fail: expects `launch: null` for inheriting members; DLC-008 hand-strips saved files into the released shape (SD-04) | expectations follow autobyteus-197 D-5 (complete member launch + `followsTeam`); DLC-008 replaced by restore of recorded values; 3/3 gated | DLC-001..007 intent |
| BEH-010 (H-10) [253 FU-003] | Contract | SUN-E2E-003 reaches real github.com (SD-04) | head reads stubbed; 3/3 gated | SUN-E2E-001/002 |
| BEH-011 (H-11) [253 FU-004] | Contract | team member read by run id → 404 (SD-04) | member artifacts read through the team run (owner routes); 2/2 gated | standalone case E-001/E-003 |
| BEH-012 (H-12) [290 FU-005, 303 FU-002] | Operational | Agent Runtimes probe fails ARP-01, 04, 09, 11 on macOS (SD-05) | green on macOS (ARP-08 not applicable there) and Linux (SD-14 shows the fixes) | every case's assertions |
| BEH-013 (H-13) [303] | Operational | TESTING.md Rule 9 (fix a test-caused failure in the branch as a labelled baseline commit) and the team skill's ticket-scope rule (an unrelated pre-existing problem is a follow-up) disagree | **Withdrawn from this ticket by the user (DEC-024)**; TESTING.md Rule 9 unchanged | — |
| BEH-014 (H-14) [290 FU-006] | Operational | already fixed by 253 W-06 (`62b653823f`) | confirmed by one run on macOS | — |
| BEH-015 (H-15) [290 FU-007] | Operational | RC-12 timed out once in six runs; no request watchdog | **Withdrawn from this ticket by the user (DEC-024)**; follow-up FU-006 | RC-12 assertions |
| BEH-016 (H-16) [204/280 FU-002] | Contract | a `not.toContain` on a removed log line always passes | removed; L1457-1461 already assert the outcome | the test's other assertions |
| BEH-017 (H-17) [14] | Operational | 24 tests reported failing; all pass today after `test:integration:prepare` in the clean environment (SD-09); EXC-E2E-004 intermittent | the 24: recorded, no change; EXC-E2E-004: reported as a product item with its cause (FU-001) | — |
| BEH-018 (H-18) [297 FU-008] | Operational | FSTDEP023 printed twice at startup, ERROR-level in the packaged log | no Fastify deprecation at startup | request logging off; responses unchanged |
| BEH-019 (H-19) [297 FU-006] | Operational | happy-dom (15 and 21) lets DOMPurify skip nodes; the Markdown sanitiser has no injection spec | sanitisation specs run under jsdom (a TESTING.md rule); a Markdown injection spec under jsdom | production sanitising (already correct, measured) |
| BEH-020 (H-20) [297 FU-002] | Operational | gateway `build-runtime-package.mjs` / `release-manifest.mjs` write to a deleted server path for a removed feature | removed with their script entry and ignore rule | the gateway's build, Docker image and tests |
| BEH-021 (H-21) [296 FU-003] | System | no real-worker coverage of removal with a live run, a worker crash then a tool call and a repair, a pending event after a reload | **Withdrawn from this ticket by the user (DEC-024)**; follow-up FU-007 | existing reload/repair E2E |
| BEH-022 (H-22) [296 FU-007, 260 FU-007] | Contract | RA-04 races RA-03's automatic re-check (1 in 6) | RA-04 independent of RA-03's timing | RA-04's assertions |
| BEH-023 (H-23) [296 FU-008] | Operational | Brief Studio E2E files skip silently on a clean clone | they fail with the prerequisite and its command; TESTING.md names it | — |
| BEH-024 (H-24) [273 FU-003] | Contract | Claude SDK session option `env` is test-only and bypasses the spawn-environment builder in cli mode | removed; tests set the process environment | production spawn environment |
| BEH-025 (H-25) [273 FU-004, 244 FU-006] | Operational | 65 tracked `tests/**/*.js` never run (compiled copies from `802033fe0e`) | deleted | `.ts` tests |
| BEH-026 (H-26) [260 FU-005] | Contract | Codex routing E2E calls the removed `getClient` | uses the lease API; passes with `RUN_CODEX_E2E=1` | its assertions |
| BEH-027 (H-27) [260 FU-006] | Operational | PT-E2E-013's no-match depends on the embedding model download | deterministic: the probe backend has no outside network, so meaning search is unavailable and the case proves the exact tier | the case's assertions |
| BEH-028 (H-28) [244 FU-005] | User | 75 `i-heroicons-*` class icons render nothing (icon-only buttons invisible) | each renders its heroicon | layout and actions |
| BEH-029 (H-29) [244 FU-007] | Operational | a failing matrix cell reports only its summary | **Withdrawn from this ticket by the user (DEC-024)**; follow-up FU-008 | the cell's assertions |
| BEH-031 (H-31) [user, 2026-10-27] | Operational | TESTING.md does not say that a live (real-model) compaction run is model-dependent; tickets may treat its failure as a defect or run it as required proof | TESTING.md states, for every ticket: compaction is proven with the deterministic layers; a live real-model compaction run is not required proof and its outcome alone does not show a defect | the existing "Forcing compaction early" guidance | user's message |
| BEH-032 (H-32) [ARCH-REV-001 AR-001; found by the type check] | User | four production type errors are live bugs: (a) phone, new team run: loading a workspace path throws when a team setup exists (`useMobileRunSetupController.ts` L336-356 calls `setWorkspaceLoading/Loaded/Error`, which `teamRunConfigStore` lost in `ebea1289bc`, 2026-08-24; L340 is outside the `try`); (b) Applications → team launch profile with a member without a runtime: "undefined needs a runtime before this team setup can be saved." (`teamLaunchReadinessCore.ts` L75-77 still reads `memberName`, renamed to `displayName` in `3927e878db`); (c) phone, team messages: always "From teammate" / "To teammate" (`MobileTeamMessages.vue` L118 reads `counterpartLabel`, replaced by `counterpart.label` in `22809caca4`; the desktop panel reads `counterpart.label`); (d) Settings → API keys, a saved custom provider while its models load or failed: "null models" (`CustomProviderDetailsCard.vue` L27; the provider list shows "—" with the loading label in that state, `ProviderModelBrowser.vue` L32-34) | (a) the workspace loads and becomes the team setup's workspace, a failure shows its message, nothing throws; (b) the member's display name; (c) the counterpart's label (as on desktop); (d) "—" with the loading label, as the provider list | everything else on those screens | read (design-review AR-001, Solution Designer triage 2026-10-27) |
| BEH-030 (H-30) [185 FU-012] | Contract | `agent_tools_mcp_server.md` lacks four adapter families | lists every registered adapter family | — |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| Ticket roles | trust a red check | no known-red or silently skipped check on `personal` | no weakened assertion |
| User | healthy code and tests | the above, merged; visible icons; quiet startup | no release unless asked |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related |
| --- | --- | --- |
| UC-001 | A ticket runs the server suites (`test:unit` incl. architecture and Work Journal, `test:integration`, `typecheck`) and they are green | BEH-001, 004, 005, 024, 025 |
| UC-002 | A ticket runs server E2E, gated runtime suites and web browser probes; they pass deterministically or fail loudly with a prerequisite | BEH-003, 009–012, 014–016, 021–023, 026, 027, 029 |
| UC-003 | A ticket runs the web unit suite and the web type check; growth of type errors fails the check | BEH-002, 007, 008, 019 |
| UC-004 | A user creates/edits an Agent and sees icon buttons; the server starts without deprecation noise | BEH-002, 018, 028 |
| UC-005 | Dead code and stale tooling removed without behaviour change | BEH-006, 020, 024, 025 |
| UC-006 | The testing rules and docs say one thing | BEH-019, 023, 030, 031 |

### Out Of Scope

- Withdrawn by the user (DEC-024), sent back as follow-ups: the GraphQL regeneration/drift script (FU-005; the Vue 3 import setting stays, as part of REQ-007), the RC-12 request watchdog (FU-006), the real-worker lifecycle E2E (FU-007), the MCP matrix tool-event output (FU-008). TESTING.md Rule 9 versus the team skill (DEC-018) stays as it is.
- Running live (real-model) compaction suites: not part of this ticket's validation (DEC-025).
- The product race behind EXC-E2E-004 (Task lifecycle stop/restore) — follow-up FU-001.
- Bundling icon data offline for `@iconify/vue` (all 304 + 75 uses load from the network) — follow-up FU-002.
- Fixing the 271 test-file type errors (baselined, burn-down follow-up FU-004) and moving the three web tests that import server code (FU-003).
- The team skill's own text (lives outside this repository); only TESTING.md changes here (DEC-018).
- Other items in the source tickets' follow-up files that the Task does not carry.

### Non-Goals

- No new product behaviour except restoring the intended icons, the Agent mutation's `internal` field and the four bug fixes of BEH-032 (approved, DEC-026).
- Not a full type-safety campaign; not faster test suites.

### Preserved Behavior Boundary

All production behaviour outside BEH-002, 018, 028, 032 is preserved: the agent/team definition GraphQL management, request logging off, the Claude spawn environment, Markdown sanitising, the gateway runtime, application lifecycle. No test assertion is weakened (QR-001).

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Behavior IDs | Priority | Rationale | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The architecture suite passes, matching the tool-unit list and the definition-getter list to the source, and runs in `test:unit` | BEH-001 | Must, first | every delivery meets it | SD-01, SD-06 | 260 FU-008, 185 FU-010, DEC-001, DEC-002 |
| REQ-002 | Agent create and update responses carry every field the Agent catalog query selects, and the definition cache spec passes with a complete fixture | BEH-002 | Must, first | 308 regression | temporary fix 10/10 | 244 FU-008 |
| REQ-003 | The archive run history E2E's definition-service double offers the methods the real service is called with | BEH-003 | Must, first | stale double | 6/6 temporary | 244 FU-009 |
| REQ-004 | The live-E2E harness supplies and closes a native command scope for each native backend it builds, so the shared live-compaction boundary unit tests (no provider calls) pass; no real-model compaction run is required (DEC-025) | BEH-004 | Must | the harness is broken | read; production precedent `NativeCommandShutdown` | 185 FU-011, DEC-025 |
| REQ-005 | `test:unit` runs `tests/agent-work-journal` (perf file gated as today) | BEH-005 | Must | outside every suite | SD-08 | 185 FU-006, DEC-002 |
| REQ-006 | The agent-management and agent-team-management tools, their registration modules, tests and doc mentions are removed | BEH-006 | Must | user decision | no caller since `eef765b901` | user |
| REQ-007 | `pnpm -C autobyteus-web typecheck` exists, passes, covers the Nuxt app with zero production errors and a shrink-only baseline for test files, checks the Electron and build projects, fails on any new error, is in TESTING.md and runs in the desktop build; generated GraphQL code imports Vue 3 | BEH-007 | Must | Task "done when" | SD-17/18 (and SD-10/11/12 on the earlier base): 105 production errors, Electron/build projects clean | 253 FU-001, DEC-003..006 |
| REQ-008 | Withdrawn by the user (DEC-024, FU-005) | — | — | — | — | user |
| REQ-009 | DLC E2E passes gated, asserting the 197 D-5 member shape including `followsTeam`, with DLC-008 replaced | BEH-009 | Must | Task | SD-04b | 253 FU-002, DEC-008 |
| REQ-010 | SUN-E2E-003 answers GitHub head reads for its fixture repository | BEH-010 | Must | Task | temporary pass | 253 FU-003 |
| REQ-011 | The multi-image E2E reads a Team member's file changes through its team run | BEH-011 | Must | Task | temporary 2/2 | 253 FU-004 |
| REQ-012 | The Agent Runtimes probe stubs Codex's current source and resets the page locale after ARP-07 on every platform | BEH-012 | Must | causes proven | SD-14 | 290 FU-005, 303 FU-002 |
| REQ-013 | Withdrawn by the user (DEC-018) | — | — | — | — | user |
| REQ-014 | The packaged-launch probe builds the host package on macOS (confirm) | BEH-014 | Should | already fixed | `62b653823f` | 290 FU-006 |
| REQ-015 | Withdrawn by the user (DEC-024, FU-006) | — | — | — | — | user |
| REQ-016 | The dead V2-warning assertion is removed | BEH-016 | Should | always passes | read | 204/280 FU-002, DEC-021 |
| REQ-017 | The server starts without Fastify deprecation warnings, request logging still off, in the studio server, the standalone application server and the Agent Tools MCP local server | BEH-018 | Should | noise, ERROR level | probe | 297 FU-008, DEC-020 |
| REQ-018 | Specs that exercise sanitisation run under jsdom (TESTING.md rule); the Markdown sanitiser has an injection spec under jsdom | BEH-019 | Should | test DOM defect | SD-15 | 297 FU-006, DEC-010 |
| REQ-019 | The gateway runtime-package and release-manifest scripts are removed | BEH-020 | Should | dead | `40f769e0d9` | 297 FU-002, DEC-011 |
| REQ-020 | Withdrawn by the user (DEC-024, FU-007) | — | — | — | — | user |
| REQ-021 | RA-04 does not depend on RA-03's re-check timing | BEH-022 | Must | flaky | read + 296 measure | 296 FU-007, DEC-022 |
| REQ-022 | Brief Studio E2E files fail with the missing prerequisite and its command instead of skipping; TESTING.md names the prerequisite for E2E | BEH-023 | Should | silent skip | read | 296 FU-008, DEC-015 |
| REQ-023 | The Claude SDK session option `env` is removed | BEH-024 | Should | test-only seam | read | 273 FU-003, DEC-012 |
| REQ-024 | The 65 tracked `.js` files under server `tests/` are removed | BEH-025 | Should | never run | measured | 273 FU-004, 244 FU-006, DEC-013 |
| REQ-025 | The Codex routing E2E uses the client lease API | BEH-026 | Should | broken | read | 260 FU-005 |
| REQ-026 | PT-E2E-013 is deterministic and proves meaning search unavailable before asserting no-match | BEH-027 | Should | flaky | read | 260 FU-006, DEC-014 |
| REQ-027 | Every former `i-heroicons-*` icon renders its heroicon | BEH-028 | Must | visible bug | read | 244 FU-005, DEC-009 |
| REQ-028 | Withdrawn by the user (DEC-024, FU-008) | — | — | — | — | user |
| REQ-029 | `agent_tools_mcp_server.md` lists every adapter family `buildDefaultAgentToolMcpAdapterProviders` registers | BEH-030 | Should | doc drift | read | 185 FU-012 |
| REQ-031 | TESTING.md states for every ticket that compaction is proven with the deterministic layers (core library and server unit tests, scripted runtimes with forced compaction), that a live real-model compaction run is not required proof (it needs a real key or signed-in CLI and enough input to reach the threshold), and that its outcome depends on the model, so a live failure alone is not a defect; other real-provider runs with small input keep TESTING.md's existing Gates rule | BEH-031 | Must | user decision | N/A | user, DEC-025 |
| REQ-032 | The four bugs of BEH-032 are fixed, each with a test that fails before the fix | BEH-032 | Should | broken today, found by the type check | read; each cause in BEH-032 | ARCH-REV-001 AR-001, DEC-026 (user) |
| REQ-030 | EXC-E2E-004 is reported to the PM with its cause (FU-001); the 24 tests are recorded as passing with their causes | BEH-017 | Should | Rule 9 | SD-09 | 14 |

## Acceptance Criteria

| AC | REQ | Trigger | Observable outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | 001 | `pnpm -C autobyteus-server-ts test:unit` | includes `tests/architecture` (7 files) and passes | log |
| AC-002 | 002 | create and edit an Agent through the store with the real Apollo cache | no missing-field error; catalog readable; spec 10/10 | spec |
| AC-003 | 003 | archive E2E | 6/6 | log |
| AC-004 | 004 | `tests/unit/secret-management` | 3 previously failing pass, no provider traffic; no live compaction run | log |
| AC-005 | 005 | `test:unit` | includes `tests/agent-work-journal` (perf skipped without its gate), passes | log |
| AC-006 | 006 | `git grep` for the 10 tool names and two module paths in server `src`, `tests`, docs | no match except UI i18n keys; server typecheck, unit, architecture pass | grep + logs |
| AC-007 | 007 | `pnpm -C autobyteus-web typecheck` on the branch | exit 0; 0 errors in non-test web files; Electron and build projects 0 | log |
| AC-008 | 007 | add one type error to a production file, then to a baselined test file beyond its count, then to a new test file | each run fails naming the file; reverted | temporary edits |
| AC-009 | 007 | `build:electron:mac` chain | runs `typecheck`; TESTING.md has the row | read + build log |
| AC-010 | — | — | Withdrawn with its requirement (DEC-018 / DEC-024) | — |
| AC-011 | 009 | DLC E2E gated | 3/3; `followsTeam` asserted | log |
| AC-012 | 010 | SUN E2E gated | 3/3; no request reaches github.com | log |
| AC-013 | 011 | multi-image E2E gated | 2/2 | log |
| AC-014 | 012 | Agent Runtimes probe on macOS (and Linux when available) | all cases Pass (ARP-08 not applicable on macOS) | result.json |
| AC-015 | — | — | Withdrawn with its requirement (DEC-018 / DEC-024) | — |
| AC-016 | 014 | `test:e2e:electron:isolation` on macOS | builds the mac package and passes | log |
| AC-017 | — | — | Withdrawn with its requirement (DEC-018 / DEC-024) | — |
| AC-018 | 016 | team-run-v1 upgrade E2E | passes without the removed line | log |
| AC-019 | 017 | start the built server | no `FSTDEP` line; no request log lines on requests | log |
| AC-020 | 018 | Markdown injection spec under jsdom | `javascript:`, event handlers, `<script>`, `<iframe>` removed | spec |
| AC-021 | 019 | gateway `build`, `typecheck`, `test`, Docker build context | unaffected; no reference to the removed scripts | logs |
| AC-022 | — | — | Withdrawn with its requirement (DEC-018 / DEC-024) | — |
| AC-023 | 021 | running-agents E2E | passes; RA-04 presses Check before asserting no operation | log |
| AC-024 | 022 | Brief Studio E2E without the package | fails naming the missing package and `test:integration:prepare`; passes after it | log |
| AC-025 | 023 | Claude client unit tests and typecheck | pass; no `env` option | log |
| AC-026 | 024 | `git ls-files 'autobyteus-server-ts/tests/**/*.js'` | empty; suites pass | log |
| AC-027 | 025 | Codex routing E2E with `RUN_CODEX_E2E=1` | passes | log |
| AC-028 | 026 | projects probe | PT-E2E-013 Pass with meaning search reported unavailable | result.json |
| AC-029 | 027 | open the pages using the former classes (MCP args list, Bulk Import, Add Server, agent detail) | icons visible; no `i-heroicons-` left | probe/screenshot + grep |
| AC-030 | — | — | Withdrawn with its requirement (DEC-018 / DEC-024) | — |
| AC-031 | 029 | read the doc | lists every registered family | read |
| AC-034 | 032 | the four scenarios of BEH-032 (component/store specs) | each desired outcome; the spec fails on the base | spec |
| AC-033 | 031 | read TESTING.md | the live-compaction rule is in the compaction guidance, committed as `docs(testing): …` | read |
| AC-032 | all | clean clone of the final branch: install, prepare, the suites above | pass | delivery |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Trigger | Expected outcome | Validity |
| --- | --- | --- | --- | --- |
| SCN-001 | Operational | a ticket role runs the TESTING.md layers on `personal` | green or a loud prerequisite failure | Supported Normal Scenario |
| SCN-002 | User | the user creates/edits an Agent; opens Settings → MCP servers / Agents | catalog stays current; icons visible | Supported Normal Scenario |
| SCN-003 | System | the server starts | no deprecation noise | Supported Normal Scenario |
| SCN-004 | System | (withdrawn with REQ-020) | — | — |
| SCN-005 | Operational | DLC-008's hand-edited released-shape saved tree restored at runtime | — | Technically Possible but Unsupported/Contrived: the startup migration converts released trees; the validator rejects that shape at runtime |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (icons only). Normative: each former class renders the heroicon its class names, at its current size and colour. No Product design needed. Other Product fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | all | Reliability | no assertion is weakened: a replaced assertion proves the same or a stronger outcome; review checks each changed expectation | code review |
| QR-002 | REQ-007 | Operability | `typecheck` finishes within about 2 minutes on the developer Mac (vue-tsc measured 37 s) | log |
| QR-003 | REQ-007 | Reliability | pinned vue-tsc and TypeScript versions, so the result does not depend on `npx` | read |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (test files, tooling, generated types; the removed tools were registered nowhere).

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | May `internal-agent-visibility.ts` call `AgentDefinitionService.getInstance()`? | Its process default factory reads definitions lazily; the class takes an injected source; the same shape was allowed for the Memory page (253 W-01). Add it to the list with that comment. | Solution Designer | Decided |
| DEC-002 | How do `tests/architecture` and `tests/agent-work-journal` join a green suite? | Add both folders to `test:unit` (12 s + 6 s); moving 14 files changes nothing else. TESTING.md already claims the architecture tracked-imports test runs in every server test run. | Solution Designer | Decided |
| DEC-003 | Type-check scope and baseline | Scope: the Nuxt app with its own tests; `electron/` and `build/` checked by their own tsconfig files (both clean); the 3 web tests that import server code excluded (FU-003). Production web code: fix all 105 errors (measured on `2f48d85d4d`) (small per file; they hide real gaps such as the 308 field). Test files: 271 errors, a per-file baseline that may only shrink, with a burn-down follow-up by area (FU-004). Industry practice for adopting a type gate on an existing codebase is a ratchet; it turns green now and cannot grow. | Solution Designer | Decided |
| DEC-004 | Where is the gate run? | A `typecheck` script, a TESTING.md row, and in the `build:electron*` chain next to the existing web guards, as the server build type-checks its sources. | Solution Designer | Decided |
| DEC-005 | Undeclared `@apollo/client`, `graphql`, `@vue/apollo-composable` (and `vite`/`vue-bundle-renderer` types in the Electron Nuxt module) | Declare what web code imports, at the versions already resolved, so the lockfile resolution does not change. | Solution Designer | Decided |
| DEC-006 | Four components with broken imports, rendered nowhere | Delete them (Principle 7, no dead code) with their now-unused localization keys. | Solution Designer | Decided |
| DEC-007 | Generated types | The regeneration/drift script is withdrawn (DEC-024, FU-005); `generated/graphql.ts` has no drift today. The codegen config gets `vueCompositionApiImportFrom: 'vue'` and the file's two import lines are corrected, because the type check needs them (REQ-007). | Solution Designer | Decided |
| DEC-008 | DLC-008 | Hand-editing saved files into the released shape is SCN-005 (contrived since 197); the released-shape upgrade is covered by the 197 migration test (F-T1/F-T2). Replace DLC-008 by: the restored copies keep their recorded member launches and sources, and their members start on their recorded models. | Solution Designer | Decided |
| DEC-009 | Icon source for the 75 class uses | Use the app's existing mechanism, `<Icon icon="heroicons:…">` (304 uses); adding a second (CSS) icon system would split ownership. Offline loading is an app-wide follow-up (FU-002). | Solution Designer | Decided |
| DEC-010 | happy-dom and DOMPurify | Upgrading does not help (21.0.4 measured broken). Rule: specs that exercise sanitisation declare `// @vitest-environment jsdom`; add the Markdown injection spec. | Solution Designer | Decided |
| DEC-011 | Gateway packaging scripts | The feature, its manifest target and its workflow were removed on 2026-09-24; delete the scripts, the `build:runtime-package` entry and the ignore rule. | Solution Designer | Decided |
| DEC-012 | Claude `env` option | Remove it (production never sets it, and it bypasses the spawn builder); tests stub the process environment. | Solution Designer | Decided |
| DEC-013 | The 65 `.js` files | Delete all, including the 3 setup copies and the twin-less compiled websocket test (its source is gone). | Solution Designer | Decided |
| DEC-014 | PT-E2E-013 | The probe backend refuses outside URLs (a probe-owned `--import` fetch stub, as the model-routing probe does); the case asserts meaning search is unavailable, then the no-match state. | Solution Designer | Decided |
| DEC-015 | Silent skips | A missing Brief Studio package fails the three E2E files with the command to build it; TESTING.md's E2E row names `test:integration:prepare`. | Solution Designer | Decided |
| DEC-016 | EXC-E2E-004 | A product race in the Task lifecycle's stop/restore sequencing; its fix needs its own design. Report it (FU-001). | Solution Designer | Decided |
| DEC-017 | RC-12 | Withdrawn with REQ-015 (DEC-024). | — | Withdrawn |
| DEC-018 | TESTING.md Rule 9 versus the team skill's ticket scope | The user left it out of this ticket (2026-10-27); TESTING.md Rule 9 already says "fix it in the branch"; nothing changes here. | User | Decided |
| DEC-024 | Which items does this ticket do? | The user: do what is still broken and worth fixing; drop the optional items. Withdrawn: the real-worker E2E, the RC-12 watchdog, the matrix tool-event output, the GraphQL regeneration script (each returned to the PM as a follow-up). | User | Decided |
| DEC-025 | Live compaction | The user: real-model compaction outcomes depend on the model, so they are not tested here; unit tests are fine; write it into TESTING.md as a global rule. Clarified the same day: tests that need a real key and a large input (compaction) cannot be relied on; end-to-end tests without a key, or with a small input, are still tested (so the one Codex routing E2E run, H-26, stays). The harness fix stays because the unit tests need it. | User | Decided |
| DEC-026 | Fix the four bugs the type check found (BEH-032)? | They are live, user-visible and small, each caused by a rename or removal that missed one reader; a type fix alone is impossible without either fixing them or hiding the error. Recommendation: fix all four in this ticket, each with a test; the dead audio-recorder chain and the overridden `nuxt.config.ts` `ignore` are removed as dead code (no behaviour change). | User | Decided ("yesss go ahead", 2026-10-27) |
| DEC-019 | Real-worker E2E expectations | Withdrawn with REQ-020 (DEC-024). | — | Withdrawn |
| DEC-020 | Fastify replacement | `logController: new LogController({ disableRequestLogging: true })` (measured). | Solution Designer | Decided |
| DEC-021 | Dead assertion | Remove the line and its comment; L1457-1461 assert the outcome. | Solution Designer | Decided |
| DEC-022 | RA-04 | Press Check once unconditionally at RA-04's start (a user check clears finished operations, `checkAll`), then wait as today. | Solution Designer | Decided |
| DEC-023 | Matrix diagnostics | Withdrawn with REQ-028 (DEC-024). | — | Withdrawn |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-003, UC-004 | BEH-002 | AC-002 | SCN-002 |
| REQ-003 | UC-002 | BEH-003 | AC-003 | SCN-001 |
| REQ-004 | UC-001 | BEH-004 | AC-004 | SCN-001 |
| REQ-005 | UC-001 | BEH-005 | AC-005 | SCN-001 |
| REQ-006 | UC-005 | BEH-006 | AC-006 | — |
| REQ-007 | UC-003 | BEH-007 | AC-007..009 | SCN-001 |
| REQ-008 | — | — | — | — |
| REQ-009..012, 014, 016 | UC-002 | BEH-009..012, 014, 016 | AC-011..014, 016, 018 | SCN-001, SCN-005 |
| REQ-013 | — | — | — | — |
| REQ-017 | UC-004 | BEH-018 | AC-019 | SCN-003 |
| REQ-018 | UC-003, UC-006 | BEH-019 | AC-020 | SCN-001 |
| REQ-019 | UC-005 | BEH-020 | AC-021 | — |
| REQ-020 | — | — | — | — |
| REQ-021, 022, 025, 026 | UC-002 | BEH-022, 023, 026, 027 | AC-023, 024, 027, 028 | SCN-001 |
| REQ-023, 024 | UC-001, UC-005 | BEH-024, 025 | AC-025, 026 | — |
| REQ-027 | UC-004 | BEH-028 | AC-029 | SCN-002 |
| REQ-029 | UC-006 | BEH-030 | AC-031 | — |
| REQ-030 | UC-002 | BEH-017 | — (report) | — |
| REQ-031 | UC-006 | BEH-031 | AC-033 | — |
| REQ-032 | UC-004 | BEH-032 | AC-034 | SCN-002 |

## Architecture Phase Input

- Approved scenarios: SCN-001..SCN-003.
- Constraints: QR-001..003; one heavy run at a time; gated runs use the scripted AGY CLI; Codex and Claude live runs only where named (AC-027).
- Decisions deferred to design: the baseline file format and checker, the typecheck tsconfig shape, the schema print entry point, the Markdown injection spec placement.
- Technical facts to verify: vue-tsc pin works with Nuxt 3.21; `build:electron*` runtime with the gate.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (User; SR-002, SR-004, SR-005)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
