# API/E2E Coverage Investigation — remote-node-runtime-sign-in

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001; SR-003/SR-004 scope confirmations, no REQ/AC change)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (current SR-004)
- Design Spec (required on every route): `design-spec.md` (SR-002, Medium / Low)
- Supplemental Task Artifacts: `evidence/SD-probe-remote-signin.sh`
- Design Review Report: `N/A — not applicable` (architecture review not selected)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001, commit `c0b385524`)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation complete, direct API/E2E route (Medium / Low), message from `/software_engineering_team/implementation_engineer`, 2026-10-21
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- A node reports `agentRuntimeSignInBrowserAvailable: Boolean!` (rule: macOS/Windows true; Linux true when `BROWSER`, `DISPLAY` or `WAYLAND_DISPLAY` is non-empty), read once by `AgentRuntimeStatusService` (REQ-002, QR-002).
- The web reads it in the `AgentRuntimes` query; the manager derives `nodeAccess` `own` / `remoteDesktop` / `remoteStatusOnly`; the own window is always `own` (DEC-003).
- `remoteDesktop`: Codex/Grok Sign in, waiting text "Finish signing in to <Runtime> in the browser on that node (VNC Viewer).", Cancel, did-not-finish, Signed in + announcement (REQ-001, AC-001/AC-002); note "Sign-in opens the browser on that node; finish it in the VNC Viewer. Update these runtimes on that node's computer." (REQ-003, AC-003); Claude/Antigravity hint "Sign in from its command line on that node." (REQ-004, AC-004); no Update and no blocked line (REQ-005).
- `remoteStatusOnly`: unchanged status-only page (AC-005). Own node unchanged (AC-006). en + zh-CN copy and docs (AC-008). Privacy rule during and after a remote sign-in (AC-009, QR-001).
- AC-007 (a Codex agent answers after sign-in on the user's node) and the end of AC-001/AC-002 (Signed in with a real account) need the user's account on the user's node running this build (R-01, R-02).
- User direction (2026-10-21, relayed by implementation): no headless-node testing beyond the unit rule and ARP-08; the nodes in use are the AutoByteus Docker image.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (Codex sign-in on a Docker node), SCN-002 (Grok), SCN-003 (note), SCN-004 (Claude/Antigravity hint), SCN-005 (node without a desktop, at the depth the user allowed), SCN-006 (own node).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1: the user finishes the vendor login in the node's Chromium; the vendor redirects to the CLI's loopback callback on the node. Trigger: vendor redirect after the user signs in. Only the user can finish with an account; the part that can be shown without one is that the CLI's callback listener runs on the same loopback as the node's Chromium while the operation runs.
  - SCN-A2: the user looks at the node's desktop through VNC while signing in. Trigger: opening the VNC Viewer. Evidence: the node's VNC stream (noVNC on the node's 6080) shows the vendor page.
  - SCN-A3: a window rebinding from one node to another (the store's `bindingRevision` path, used by mobile node sessions) re-reads the node fact; a desktop node followed by a headless node ends status only.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Sign in on a remote desktop node | Added | REQ-001, REQ-002, design DS-001/DS-002 | Unit (reused), probe remote-desktop journey with a real backend, real Docker node journey |
| BEH-002 Remote note by node fact | Changed | REQ-003, REQ-005 | Unit (reused), probe, Docker journey |
| BEH-003 Remote command-line hint | Added | REQ-004 | Unit (reused), probe, Docker journey |
| BEH-004 Node without a desktop stays status only | Preserved | REQ-002, AC-005 | Unit rule matrix (reused), probe ARP-08 with the API fact asserted false |
| BEH-005 Own node unchanged | Preserved | REQ-006, AC-006 | Probe ARP-01…07 (rerun), unit (reused) |
| BEH-006 Codex works after sign-in | Preserved/outside change | AC-007 | Only the user can check (real account) |
| GraphQL `agentRuntimeSignInBrowserAvailable` | Added | design Interface Boundary Mapping | Server E2E over real HTTP (new AR-13), probe API assertions, Docker API |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `isSignInBrowserAvailable`, service field | Unit matrix + service tests (IMP-02) | Real process environment of a server | Server E2E, Docker node |
| API / transport / contract | Yes | New GraphQL query field in the web's `AgentRuntimes` document | Resolver unit test (mocked service) | The field over real HTTP in the web's exact document | Server E2E (AR-13), probe |
| Frontend component / state | Yes | Manager `nodeAccess`, row gating, composable ref | Web unit (IMP-04) with mocked Apollo | Real backend answers, polling, rebinding | Browser probe |
| Browser integration / user journey | Yes | Settings page in a remote-node window | Probe ARP-08 (status only only) | Remote-desktop journey with a real backend | Probe ARP-11/12; Docker journey |
| Authentication / session / permissions | Yes (vendor login, not AutoByteus auth) | Vendor CLI login started on the node | IMP-09 API, IMP-12 UI up to the vendor page | Privacy of the live sign-in URL's parameters; callback reachability | Docker journey with secret scan |
| Desktop renderer / web-equivalent UI | Yes | Same renderer as the browser | Web unit | — | Browser probe |
| Desktop shell / Electron-specific integration | No | Window binding and shell code unchanged; `isEmbeddedWindow` is renderer state | — | — | None (web-equivalent) |
| Process / lifecycle | No change | Sign-in operation unchanged | Server E2E AR-07…AR-12 | — | Rerun of the E2E file |
| Persisted-data transition | No | Not Affected | — | — | None |
| Worker / queue / distributed coordination | Yes (two nodes) | Web window bound to a remote node | Probe binding | Real remote node (Docker) | Docker journey |
| External integration | Yes | Vendor CLIs + node Chromium + VNC | IMP-09, IMP-12 | Account completion | Docker journey; user check |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/remote-node-runtime-sign-in`, branch `feature/remote-node-runtime-sign-in`
- Project type and runtime stack: pnpm monorepo; Node 22; Fastify/GraphQL server (`autobyteus-server-ts`), Nuxt 3 web (`autobyteus-web`), Electron shell; Docker server image `autobyteus/autobyteus-server:beta`
- Project testing guideline path(s): `TESTING.md` (repository root); no closer `TESTING*.md` under `autobyteus-web/` or `autobyteus-server-ts/`
- Conflicting, missing, or unclear project instructions: `pnpm` is not on PATH; corepack's pnpm through the shim `/tmp/rnrs-bin` (as the implementation used). No conflict with the skill.
- Required environment variables or secrets available: `N/A` (no provider keys needed; no vendor account used)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` §Test layers | Layer commands | Server E2E one file `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; probes `pnpm -C autobyteus-web test:e2e:<name>` |
| `TESTING.md` §Environments | Clean env for E2E | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR"` |
| `TESTING.md` §Docker server nodes | Test-owned container rules | Same image, `127.0.0.1`, free ports, no user volumes; branch `dist` mounted read-only after checking only changed files differ (IMP-08); `docker rm -f -v` |
| `TESTING.md` §Browser probes | Probe rules | Fresh `--output-dir`, warm the Nuxt dev server, fail on browser errors, assert DOM/API, check cleanup receipt |
| `TESTING.md` Rules 2, 9 | Safety, failures | Never touch the user's running AutoByteus or node containers (`autobyteus-server-0/1` on 8001/8002); every failure needs its cause |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` header | Command | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts --no-watch` |
| `autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs` header | Probe command | `node tests/e2e/agent-runtimes-settings-probe.mjs [--skip-server-build] [--output-dir=…]`; needs a current server build |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` (the probe runs it without `--skip-server-build`) | Serialize with Nuxt dev | exit 0 | — |
| Server E2E studio server | `autobyteus-server-ts` | vitest file (in-process, port 0) | Fake CLIs in a temp root | file's `beforeAll` | file's `afterAll` |
| Probe backends (headless + desktop) and Nuxt dev | `autobyteus-web` | the probe | free ports, temp root | `/rest/health`, frontend 200 | probe cleanup receipt |
| Docker node (API-08) | worktree | `docker run` of `autobyteus/autobyteus-server:beta` with branch `dist` read-only, `127.0.0.1` ports, fresh anonymous volumes, `--security-opt seccomp=unconfined --cap-add SYS_ADMIN` (as the shipped compose) | name `api08-signin-node` | GraphQL `__typename` 200 | `docker rm -f -v` |
| Nuxt dev + headless Chrome (API-08) | `autobyteus-web` | `corepack pnpm dev` bound to the container | free port | frontend 200 | process-group SIGTERM |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Signed-out runtimes | Scripted fake CLIs (`agent-runtimes-fake-cli.mjs`) for E2E/probe; fresh container volumes for Docker | No account, no network in E2E/probe | temp roots removed |
| Live vendor sign-in URL (Docker) | Real `codex login` / `grok login --oauth` in the test container, opened in its Chromium | Vendor pages are reached, nothing is submitted; URL parameters only hashed/compared in memory, never written | container removed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/runtime-management/agent-runtimes/sign-in-browser-availability.test.ts` | Rule matrix (darwin/win32 true; Linux by `BROWSER`/`DISPLAY`/`WAYLAND_DISPLAY`) | REQ-002, AC-005 | Still Valid | IMP-02 | Reuse |
| `…/agent-runtime-status-service.test.ts` | Injected and default fact | REQ-002, QR-002 | Still Valid | IMP-02 | Reuse |
| `autobyteus-server-ts/tests/unit/api/graphql/agent-runtimes-resolver.test.ts` | Resolver returns the service's fact | Interface mapping | Still Valid | IMP-02 | Reuse |
| `autobyteus-web/components/settings/agent-runtimes/__tests__/AgentRuntimesManager.spec.ts` | Own, remoteDesktop (Sign in, waiting, Cancel, did-not-finish, Signed in, announcement), remoteStatusOnly | AC-001…AC-006 | Still Valid | IMP-04 | Reuse |
| `autobyteus-web/localization/messages/__tests__/agentRuntimesSettingsCatalog.spec.ts` | en/zh-CN keys and texts | AC-008 | Still Valid | IMP-04 | Reuse |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` | Real GraphQL contract of the page (AR-01…AR-12) | AC-006 preserved operations | Needs Update | no case reads the new field | Add AR-13 for the field in the web's document |
| `autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs` | Real-stack page journeys; ARP-08 remote status only | AC-005, AC-006 | Needs Update | no remote-desktop case | Add a desktop backend, ARP-11/ARP-12, API fact in ARP-08, scan both nodes |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | Running-agent counts | runtime-lifecycle-review | Out Of Scope | not touched | none |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | REQ-002, AC-005, QR-002 | Server rule, service, resolver | Reused | IMP-02 | Ran on `c0b385524`; `git diff --name-only c0b385524 HEAD` before my changes touches only ticket docs |
| API-02 | — | Server `src` typecheck | Reused | IMP-03 | Same commit, no source change since |
| API-03 | AC-001…AC-006, AC-008, REQ-007 | Web manager/row/composable/catalogs, guards | Reused | IMP-04, IMP-05 | Same commit; I add no web source |
| API-04 | regression | Full web unit suite | Reused | IMP-07 | Same commit |
| API-05 | regression | Full server unit suite | Reused | IMP-06, IMP-06b | Same commit; 3 failures in 2 files outside the change's import graph, location-dependent, recorded as FU-003 |
| API-06 | REQ-002, AC-001 (contract), AC-005, AC-006 | Server GraphQL over real HTTP | Durable | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts --no-watch` | New AR-13 reads the field in the web's exact `AgentRuntimes` document; AR-01…AR-12 rerun as preserved behavior |
| API-07 | AC-001…AC-006, AC-008, AC-009, REQ-005 | Real backends + Nuxt + headless Chrome | Durable | `pnpm -C autobyteus-web test:e2e:agent-runtimes-settings -- --output-dir=<fresh>` (builds the server) | ARP-01…ARP-10 preserved; new desktop backend; ARP-08 asserts the API fact false; ARP-11 remote-desktop journey (note, Sign in Codex/Grok, hints, no Update/blocked, waiting text, Cancel, completion → Signed in + announcement, rebind to the headless node → status only); ARP-12 zh-CN remote copy at 1440 and 739 px; ARP-10 scans both nodes |
| API-08 | AC-001/AC-002 (to the vendor page), AC-003, AC-004, AC-009, SCN-A1, SCN-A2 | Real Docker node (branch dist) + Nuxt + headless Chrome + node Chromium + VNC | Temporary Probe (Journey) | `node tickets/in-progress/remote-node-runtime-sign-in/evidence/API-08-docker-node-remote-signin.mjs <worktree> <evidence dir>` | Needs Docker, the published image and the vendors' live sites, which the repository's deterministic probes do not use; kept as ticket evidence |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-07 | `autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs` cases ARP-11, ARP-12 | The remote-desktop page is the ticket's main journey; only mocked unit tests covered it in the repository |
| API-06 | `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` case AR-13 | The new contract field over real HTTP, in the web's document |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-07 | probe ARP-08, ARP-10, header, node setup | Assert `agentRuntimeSignInBrowserAvailable` false for the headless node; scan both nodes; second (desktop) backend with `BROWSER` set and Grok installed | Narrow |
| API-06 | E2E file header and hoisted setup | Set `BROWSER` for the test server so the fact is deterministic on every platform; restore after | — |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan (When Applicable)

- Desktop framework / shell: Electron
- Testing guideline used: `TESTING.md` §Choosing the path
- Web-equivalent behavior: everything this ticket changes (renderer component state from the bound node's GraphQL answer)
- Shell-specific or lifecycle behavior: none changed (window binding, preload and embedded server untouched)
- Chosen validation approach: browser probe and a browser journey against a real Docker node; no isolated desktop instance, since no shell code changed
- How the run avoids disturbing an already-running desktop application: no Electron launched; user's containers `autobyteus-server-0/1` untouched; own ports only

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order and commands: Docker container (branch dist) → wait for GraphQL → Nuxt dev → headless Chrome; page bound to the container as a remote node (the probes' established binding)
- Environment choices: shipped container security options (R-03); `AUTOBYTEUS_VNC_SERVER_HOSTS` set as the shipped compose does
- Health / readiness checks: GraphQL `__typename`, frontend 200, rows read
- Seed data / fixtures: none; fresh volumes give signed-out CLIs
- Test identities: none; no vendor account used
- Journeys: SCN-001/002 up to the vendor page, Cancel; SCN-003/004 copy; SCN-A1 callback listener; SCN-A2 VNC view
- Evidence: DOM assertions, node Chromium tab list (query redacted), noVNC screenshots, GraphQL response capture, scan result counts
- Owned processes and temporary state to clean up: container (`docker rm -f -v`), Nuxt dev process group, browser

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-001/AC-002 end: Signed in with a real account on a Docker node | Needs the user's vendor accounts; tests must not use the user's nodes (TESTING.md Rule 2) | R-01 | Yes | Delivery: user's node on this build (R-02) |
| AC-007: Codex agent answers after sign-in on the user's node | Needs the real account and node | Low (outside the change) | Yes | Delivery |
| Headless-node journeys beyond ARP-08 and the unit rule | User direction 2026-10-21 | Low | No | FU-002 |
| Did-not-finish after the real 10-minute time-out in the browser | Real time-out is 10 minutes; covered by unit test and server E2E AR-09 with a shortened time-out | Low | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added/updated)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: reused implementation checks ran on `c0b385524`; the commit validated is the branch head, whose only changes since are ticket documents and the test files added in this round.
