# API/E2E Coverage Investigation — runtime-lifecycle-review (Settings → Agent Runtimes)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-010; "UI note (SR-010)" items (1)–(3), item (3) = SR-012 container-width switch)
- Investigation Notes: `investigation-notes.md` (E-R01…E-R22, E-A01…E-A10)
- Solution Revision Record: `solution-revision-record.md` (SR-001…SR-012; SR-012 edits not committed yet by the designer)
- Design Spec (required on every route): `design-spec.md` (SR-011, Claude rule corrected in SR-012)
- Supplemental Task Artifacts: Product `ui-ux-spec.md` (a74ecd4) at `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/runtime-lifecycle-review/ui-ux-spec.md`, VIS-001…VIS-023 (VIS-010/011/012/021/023 no longer apply); `follow-ups.md` (FU-001…FU-005)
- Design Review Report: `design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002 Pass, 9.4/10)
- Code Review Revision Record: `code-review-revision-record.md`
- API/E2E Revision Record: `api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-001` (baseline)
- Current Investigation Round: 1
- Trigger: code review CRR-002 Pass → API/E2E validation (Large / High, reviewed route)
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file, round 1

Validated code: branch `codex/runtime-lifecycle-design-review`, HEAD `a5d4eeaa20` (code at `52aa663edd`; `git diff --name-only 52aa663edd a5d4eeaa20` lists only ticket docs and evidence), base `origin/personal` `aac5da3112`.

## Current Requirement And Design Basis

Settings → Agent Runtimes lists Codex, Claude, Antigravity and Grok for the window's node (REQ-001). Each installed runtime is checked independently: installed version through the unchanged resolver plus a fresh `--version`, newest version from its vendor's source, sign-in state through `AgentRuntimeSignInReader` (REQ-002, REQ-005, DEC-002, DEC-005). Update runs `<runtime> update`, shows the command and the vendor's latest line, ends in "Updated from X to Y." + re-check (kept, AR-006) or "Update failed…" + vendor output + Try again; exit 0 without a newer version is a failure; refused while that runtime has running agents, counting process agents and Application agents (REQ-003, DEC-003, SR-011). Not installed → link + "After installing, restart AutoByteus." (REQ-004, UD-007). Sign in for Codex (`codex login`) and Grok (`grok login --oauth`) with Cancel and a 10-minute time-out → "Sign-in didn't finish. Try again."; Claude and Antigravity show "Sign in from its command line." (REQ-006, UD-006, UD-008). Remote node window is status only (REQ-007). No credential, sign-in URL secret or code in logs, storage or API responses (REQ-008). Every started vendor process ends (QR-003). Codex `notRequired` → "–" (DEC-008). Application launch readiness for Codex/Claude now reads sign-in through the reader with today's rules and reason texts (design "Adapter mapping"). The list switches table ↔ stacked at ~58 rem list width (SR-012).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (open page, per-runtime checks), SCN-002 (Update), SCN-003 (Sign in, browser route), SCN-005 (remote node window). Code-review scenarios SCN-001a (Claude signed out, JSON + exit 1) and UI-W (640–1100 px window) are covered too.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1 **User reopens the page / Check again after a source was unreachable**: the failed row recovers on the next check while others keep their state (trigger: Check again).
  - SCN-A2 **Update while an Application's team is running on that runtime** (trigger: Update click while Brief Studio has a live drafting run on Codex). Application agents live in the application platform's own `AgentRunManager` (SR-011); only wiring tests prove it today.
  - SCN-A3 **Application launch configuration view** (trigger: opening an Application's launch settings, which runs the host capability validator): Codex/Claude sign-in readiness and reason texts must be unchanged now that they come from the reader.
  - SCN-A4 **Server shutdown while a sign-in or update is running** (trigger: user quits AutoByteus mid sign-in): the vendor process must end (QR-003).
  - SCN-A5 **A vendor login that ignores SIGTERM** (trigger: Cancel / time-out on a CLI that keeps waiting): SIGKILL after 3 s (QR-003).
  - SCN-A6 **Codex with a custom provider that needs no OpenAI sign-in** (DEC-008): Account "–", no button.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded. Not tested as contrived: two windows racing Update on the same runtime (one user; the server's one-operation rule is covered by the BUSY refusal instead).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 rows, installed version | Added | REQ-001, AC-001, DS-001 | GraphQL e2e with fake CLIs; browser probe on a real stack |
| BEH-002 independent latest check | Added | REQ-002, AC-002, QR-002 | e2e with one source failing and one slow; Check again recovery |
| BEH-003 update + agent rule | Added | REQ-003, AC-003/004, DEC-003, SR-011 | e2e success / exit-0-same-version / failure; live standalone + Application team count |
| BEH-004 not installed | Added | REQ-004, AC-005, UD-007 | e2e + probe (link, hint, no action) |
| BEH-005 sign-in read + Codex/Grok sign-in | Added / Changed (detection moved) | REQ-005/006/008, AC-006/007/009/011 | e2e sign-in success, cancel, time-out, secret scan; real-vendor signed-out shapes |
| BEH-006 remote node status only | Added (UI-only gate) | REQ-007, AC-010, E-R10 | browser probe with a non-embedded window binding |
| Application launch readiness (Codex/Claude) | Changed (owner moved, rules kept) | design "Adapter mapping", ARCH-REV-003 | e2e over the real launch-configuration REST view |
| Runtime lookup, execution, model menu, AGY/Grok app readiness | Preserved | UD-007, design Change Scope | existing suites (unit/integration reuse, integration run) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `runtime-management/agent-runtimes/*` | unit tests (IMP-04, IMP-12) | real child processes and real HTTP server together | server GraphQL e2e |
| API / transport / contract | Yes | GraphQL `agentRuntimes` + 4 mutations | resolver unit test with fake service | real schema over HTTP, error codes, nullability | server GraphQL e2e |
| Frontend component / state | Yes | Settings section, composable | component spec (IMP-07) | real polling against a real server | browser probe |
| Browser integration / user journey | Yes | Settings → Agent Runtimes | IMP-10 self-check (739 px, zoom) | narrow/wide/1280/1024 widths, zh-CN, remote window, journeys as assertions | browser probe (durable) |
| Authentication / session / permissions | Yes | vendor sign-in reads and login processes | unit fakes | real vendors' signed-out output shapes; secrets in logs | real-shape probe + e2e secret scan |
| Desktop renderer / web-equivalent UI | Yes | same renderer | — | — | browser probe |
| Desktop shell / Electron-specific integration | No (unchanged) | window context only read | — | the embedded server's login-shell PATH finding real runtimes | isolated desktop instance (read-only page open) |
| Process / lifecycle | Yes | `RuntimeProcessOperation`, close path | unit with a fake process | real SIGTERM/SIGKILL, server close | e2e |
| Persisted-data transition | No | `Not Affected` | — | — | — |
| Worker / queue / distributed coordination | Yes (read) | Application scope's run manager count | wiring unit test | a live Application team run | e2e with Brief Studio |
| External integration | Yes | vendor sources (GitHub, downloads.claude.ai, AGY manifest, `grok update --check`) | strategy unit tests (stubbed) | real response shape | IMP-10 real GETs; stubbed sources in e2e/probe; isolated desktop open |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review`
- Project type and runtime stack: pnpm monorepo; Fastify + type-graphql server (`autobyteus-server-ts`), Nuxt 3 web/Electron renderer (`autobyteus-web`); vitest; playwright-core probes.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/TESTING.md` (same file in the worktree root). No closer `TESTING*.md` under the changed packages.
- Conflicting, missing, or unclear project instructions: none. Note: server integration and e2e share `tests/.tmp/autobyteus-server-test.db`, so the two suites are never run at the same time.
- Required environment variables or secrets available: `N/A` (no provider credentials; every runtime is scripted, the real CLIs are only run signed out in throwaway homes).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | global testing rules | layers; install/build first; integration needs `test:integration:prepare`; e2e inherit the shell → run with `env -i PATH HOME=<resolved temp> TMPDIR`; never edit user CLI configs; isolated instances; probes own their stack and pass a fresh `--output-dir`; rerun by impact |
| `AGENTS.md`, `DESIGN.md` | repo instructions | follow TESTING.md |
| `autobyteus-server-ts/vitest.config.ts`, `tests/setup/*` | runner config | forks, no file parallelism; unit/integration env isolation; shared sqlite test DB |
| `autobyteus-server-ts/tests/e2e/helpers/studio-runtime-test-server.ts`, `collaboration-root-harness.ts` | real studio server in-process on a free port | `buildStudioServer` + `fastify.listen({port: 0})`; data dir via `setCustomAppDataDir` |
| `autobyteus-server-ts/scripts/integration-test-prerequisites.mjs` | integration build outputs | builds server dist, SDKs, devkit, Brief Studio importable package |
| `autobyteus-web/tests/e2e/embedding-settings-probe.mjs` | real-stack Settings probe pattern | built `dist/app.js` on a fresh data root, Nuxt dev with `BACKEND_NODE_BASE_URL`, headless Chrome, `result.json`, cleanup receipt |
| `docs/isolated-app-instances.md` | isolated desktop instance | `pnpm --silent isolated-app start --build`, `stop`, `list` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server e2e (in-process studio) | `autobyteus-server-ts` | `env -i … pnpm exec vitest run <file> --no-watch` | free port, temp data dir, temp HOME | `fastify.listen` resolved | `fastify.close()`, temp dirs removed |
| Probe backend | `autobyteus-server-ts` | `node dist/app.js --port <free> --data-dir <temp>` + `--import` vendor-source stub | needs `pnpm -C autobyteus-server-ts build` (done by API-00) | `/rest/health` | process-group SIGTERM/SIGKILL, temp root removed |
| Probe frontend | `autobyteus-web` | `pnpm dev --port <free>` with `BACKEND_NODE_BASE_URL` | one Nuxt dev server at a time in this worktree | HTTP 200 + warm-up | process-group stop |
| Headless Chrome | — | playwright-core `chromium.launch` | system Chrome | page loaded | `browser.close()` |
| Isolated desktop instance | worktree root | `pnpm --silent isolated-app start --build` | user's real CLIs on the login-shell PATH, read-only page open | reported ports | `isolated-app stop`, `list` empty |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Four runtime CLIs | test-owned scripted fakes written to the test's temp dir, selected by `CODEX_APP_SERVER_COMMAND`, `CLAUDE_CODE_EXECUTABLE_PATH`, `ANTIGRAVITY_CLI_COMMAND`, `GROK_BUILD_COMMAND` | output shapes copied from the real CLIs run signed out in an empty temp HOME (API-02) | temp dir removed |
| Vendor latest-version sources | e2e: `fetch` stub inside the test process for the three vendor hosts only; probe: `--import` stub module in the backend process | no real network needed; real GETs already shown in IMP-10 | none |
| Application with a team | Brief Studio importable package (built by API-00), imported through `importApplicationPackage` | test data root only | data root removed |
| Accounts | none; signed-out real CLIs only in throwaway homes | never the user's CLI homes | — |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/runtime-management/agent-runtimes/agent-runtime-strategies.test.ts` | strategies against scripted fakes, stubbed sources | DEC-002, DEC-005, AC-002/006/009 | Still Valid | IMP-04, IMP-12 | Reuse |
| `tests/unit/runtime-management/agent-runtimes/agent-runtime-status-service.test.ts` | independence, agent rule, op results, cancel/time-out with fake processes | AC-002/003/004/007, QR-003 | Still Valid | IMP-12 | Reuse |
| `tests/unit/runtime-management/agent-runtimes/runtime-process-operation.test.ts` | real child process: output cap, ANSI, cancel, time-out | QR-003 | Still Valid | IMP-04 | Reuse |
| `tests/unit/api/graphql/agent-runtimes-resolver.test.ts` | resolver mapping, error codes, composition | API contract | Still Valid (mocked service) | IMP-12 | Reuse |
| `tests/unit/application-platform/...credential-readiness-adapter.test.ts` | adapter mapping and texts through a fake reader | readiness unchanged | Still Valid (fake reader) | IMP-12 | Reuse |
| `tests/unit/application-platform/.../application-execution-scope.test.ts` | count by kind (wiring) | AC-004, AR-008 | Still Valid (wiring only) | IMP-12 | Reuse; live proof added (API-11) |
| `autobyteus-web/components/settings/agent-runtimes/__tests__/AgentRuntimesManager.spec.ts` | 11 component cases incl. remote and blocked | AC-001…010 (component) | Still Valid | IMP-07 | Reuse |
| `tests/architecture/*` | boundary guards | DESIGN.md | Still Valid; 1 baseline failure FU-005 | IMP-05 | Reuse |
| `tests/e2e/runtime/agy-runtime-availability-graphql.e2e.test.ts` | AGY availability reasons | preserved AGY readiness | Still Valid | unchanged files | Out of scope of this change (not run) |
| server `tests/integration/**` | in-process integration incl. application platform | preserved behavior | Still Valid | never run on this change | Run (API-01) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | all (unit level) | server unit | Reused | IMP-04 (`8a2db203dc`) + IMP-12 (`52aa663edd`) | IMP-12 reran every file the IR-002 diff touches; nothing changed since `52aa663edd` |
| API-R2 | — | server typecheck | Reused | IMP-12 `TSC EXIT 0` | same commit |
| API-R3 | — | architecture guards | Reused | IMP-05 | no architecture-relevant file changed since; baseline failure FU-005 |
| API-R4 | AC-001…010 (component) | web guards + specs | Reused | IMP-06, IMP-07 | no web file changed since `8a2db203dc` |
| API-00 | — | build | Setup | `pnpm -C autobyteus-server-ts test:integration:prepare` | integration + Brief Studio package + server dist for the probe |
| API-01 | preserved behavior | server integration | Existing Test | `pnpm -C autobyteus-server-ts test:integration` | never run on this change; application-platform files changed |
| API-02 | AC-006/009 inputs, fake fidelity | real vendor CLIs, signed out | Temporary Probe | `node probe-real-shapes.mjs` (empty temp HOME) | read-only capture of real answer shapes for the fakes; not durable (depends on the machine's installs) |
| API-10 | AC-001(API), 002, 003, 005, 006, 007, 009, 011, QR-002, QR-003, DEC-008 | GraphQL over HTTP on a real studio server, real child processes | Durable | new `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` | the design's named GraphQL e2e |
| API-11 | AC-004, readiness unchanged (SCN-A2, SCN-A3) | studio server + Brief Studio Application backend + process and Application run managers | Durable | new `tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | AR-008 has only wiring proof; readiness move has only fake-reader proof |
| API-12 | AC-001 (API), AC-002, AC-006 with real installs | real studio server + the real installed CLIs (unchanged resolvers, PATH) in an empty HOME/CODEX_HOME + real vendor sources | Temporary Probe | temporary `tests/e2e/runtime/tmp-rlr-real-cli-signed-out.e2e.test.ts` (source kept in its evidence log, file removed) | added after API-10/11 to close the fake/stub gap without any account; not durable because it depends on this machine's installs and the network |
| API-21 | — | web guards | Existing Test | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | the probe and a `package.json` script were added to `autobyteus-web` |
| API-20 | AC-001, 002, 003, 005, 006, 007, 009, 010, 011 (UI), SR-012 widths, zh-CN | browser on a real stack (built server + Nuxt dev + headless Chrome) | Durable | new `autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs` + `test:e2e:agent-runtimes-settings` | repeatable UI proof of journeys, widths and the remote window |
| API-30 | AC-001, AC-006 (real installs, real desktop) | isolated desktop instance, user's real CLIs, read-only page open | Journey | planned: `pnpm --silent isolated-app start --build`, open Settings → Agent Runtimes | **Not run (decision during execution):** an isolated instance's embedded server passes only `CODEX_HOME` through, so opening the page would run `claude auth status`, `agy models` and `grok models` against the user's real accounts; the design forbids his accounts in automated tests. Real installs are read in an empty HOME by API-12 instead; the real desktop open stays the user's check (AC-001) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-10 | `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` | API contract, process lifecycle and secret handling across real HTTP/processes; regression guard for vendor answer shapes |
| API-11 | `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | live count across both run managers; application readiness through the moved reader |
| API-20 | `autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs` (+ `package.json` script) | the UI's width switch, journeys and remote window against a real server |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron wrapping the Nuxt renderer with an embedded server.
- Testing guideline used: `TESTING.md` "Isolated desktop instance", `docs/isolated-app-instances.md`.
- Web-equivalent behavior: everything on the page (renderer + GraphQL) → browser probe API-20.
- Shell-specific or lifecycle behavior: none changed. The embedded server's login-shell PATH decides which runtimes are found (E-A02) → one read-only isolated-instance open (API-30).
- Chosen validation approach: probe for behavior; isolated instance only to see real installs through the real shell.
- How the run avoids disturbing the running desktop app: isolated instance with its own data root and ports; no Update or Sign in click; the user's AutoByteus is not touched.

## Live Environment And Fixture Plan

- Startup order: build (API-00) → server e2e (API-10, API-11, never concurrent with API-01) → probe (API-20, owns backend + Nuxt + Chrome) → isolated instance (API-30).
- Environment choices: `env -i PATH HOME=<resolved temp> TMPDIR` for e2e; fakes in temp dirs; vendor sources stubbed; probe locale en and zh-CN; widths 1440, 1280, 1024, 739, 390.
- Health / readiness: `/rest/health`, Nuxt HTTP 200 + warm-up, `agentRuntimes` rows present.
- Seed data: none besides fakes; Brief Studio imported through GraphQL in API-11.
- Identities: none; signed-out fakes and signed-in fakes driven by state files.
- Evidence: test logs with headers, GraphQL snapshots, probe `result.json`, screenshots per VIS, secret-scan counts, process checks.
- Owned processes / state to clean up: e2e servers and temp dirs; probe backend, Nuxt dev, Chrome, temp root; isolated instance.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| `codex login` opening the browser when started by AutoByteus (no TTY) | needs a real Codex sign-in with an account | Sign in may time out instead of opening the browser | Yes | delivery, with the user's consent |
| `grok models` output when signed in | needs the user's Grok account | a signed-in answer with unexpected text | Yes | delivery, with the user's consent |
| One real update and one real sign-in | changes the user's installs/accounts | vendor command differences (Homebrew etc.) | Yes | delivery, with the user's consent |
| Vendor source availability over time (GitHub 60/h, undocumented hosts) | external | Check failed for that row only | No | covered as Check failed path |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| The requirements' "UI note (SR-010)" item (3) says windows "roughly 640–1100 px wide" show stacked rows; measured beside the Settings menu, the table starts at a 1252 px window (list 58.1 rem; 1250 px → stacked). The normative rule (table when the list is ≥ ~58 rem; table at 1280 and 1440 px) holds, so this is a wording correction, not a failure | Unclear (documentation accuracy; no behavior change) | `evidence/api-e2e/API-20-agent-runtimes-settings-probe/result.json` → `ARP-02-layout.tableFromWindowPx` | Solution Designer (informational) |
| An application imported while the server runs with a Codex launch runtime is quarantined (readiness spawns Codex in a runtime folder that does not exist yet). Same cwd on the base: not caused by this ticket | Out of scope → follow-up FU-006 | `follow-ups.md` FU-006 | Solution Designer (sends follow-ups) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: API-10, API-11, API-20)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes: real-vendor shapes used by the fakes are recorded in `evidence/api-e2e/API-02-real-cli-signed-out-shapes.log`. During execution API-11 registers Brief Studio through the server's package-roots setting at start (`AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS`) instead of `importApplicationPackage`, because a mid-run import of a Codex-default app is quarantined (FU-006).
