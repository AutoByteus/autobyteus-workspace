# API/E2E Coverage Investigation — html-preview-isolation (autobyteus-417)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved; baseline SR-002; current wording SR-004, AC-004 reworded)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001…SR-004)
- Design Spec (required on every route): `design-spec.md` (SR-004, `Ready`)
- Supplemental Task Artifacts: `evidence/preview-probe/` (reproduction, evidence only)
- Design Review Report: `design-review-report.md` (ARCH-REV-001 `Pass`, residual R-1…R-4)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 `Pass`, CAND-04 held for evidence)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review `Pass` (CRR-001) on IR-001, code commit `cdba18ba35`; message from `/software_engineering_team/code_reviewer`, 2026-11-07
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this document, round 1

## Current Requirement And Design Basis

Every HTML preview (Files-area workspace preview; Artifacts, team/collaboration references and local files as blob previews; phone Artifacts) must run the previewed page with an opaque origin (REQ-001). The page cannot read/script the app window, call the preload API or read app storage, including the phone credential (REQ-002). Its WebSocket and API requests to a node carry `Origin: null` and are refused; no request it can make without an Origin changes node state (REQ-003). Previews stay useful: render, inline and classic scripts, relative CSS and images of workspace files, CDN resources; a blob (artifact) preview updates when its content changes; a workspace preview keeps today's refresh behaviour, i.e. shows a changed file after reopening (REQ-004, AC-004 as reworded in SR-004; the missing auto-reload is pre-existing FU-003). The workspace static route sandboxes its documents wherever opened (REQ-005, CSP `sandbox allow-scripts` on successful file replies only). The approved losses (DEC-001 option A: relative module scripts, `fetch`/XHR of workspace files, workspace web fonts, workers, storage, cookies) behave as documented and the docs say so (REQ-006/AC-007). Application iframes and other viewers unchanged (REQ-007/AC-008).

Design: one attribute in `HtmlPreviewer.vue` (`sandbox="allow-scripts"`, Blob = content only) and one header in `api/rest/workspaces.ts` static route. Node gate (403) unchanged and is what refuses the opaque page. Design step 5 assigns AC-002/003/004/006 on a worktree build to API/E2E with synthetic pages only (QR-002).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (workspace HTML in the Files area), SCN-002 (HTML artifact on desktop and phone), SCN-004 (hostile page tries window, preload, storage, node), SCN-005 (other viewers/applications: existing suites). SCN-003 (local absolute-path HTML in the desktop window) goes through the same `HtmlPreviewer` blob branch as SCN-002; covered by the component spec (IMP-02 "uses a Blob URL for a local absolute path") and by the desktop artifact journey exercising that branch in the real shell; no separate journey (see Not Tested).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1: an agent rewrites an HTML artifact the user is previewing (trigger: the run writes the same path again → FILE_CHANGE → `ArtifactContentViewer` refetch). Proves the AC-004 artifact refresh.
  - SCN-A2: the user changes an open workspace HTML file and reopens it (trigger: file changed on disk while open; user switches tab/reopens). Measures the AC-004 workspace refresh as reworded (SR-004) and records CAND-04/R-3 as measured.
  - SCN-A3: a hostile page uses a GET without Origin (`<img src="/graphql?query=mutation…">`) to try to change node state (REQ-003 second clause, ARCH-REV residual R-2).
  - SCN-A4: the static URL opened top-level in a browser tab (AC-005 probe part), including non-HTML assets still served with their type.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): None recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 workspace preview origin | Changed | REQ-001/003/004, design DS-001 | Real app: origin `null`, node refusal, assets load, losses |
| BEH-002 blob preview origin (desktop) | Changed | REQ-001…004, DS-002 | Real app: origin `null`; parent/preload/storage blocked; node refusal |
| BEH-003 phone artifact preview | Changed | REQ-001/002/004, AC-006 | Paired phone browser: origin `null`, credential unreadable, renders |
| BEH-004 application iframes | Preserved | REQ-007, AC-008 | Existing suites (IMP-05) |
| BEH-005 preview chrome / refresh | Preserved (SR-004 wording) | REQ-004, AC-004 | Measure artifact refresh and workspace reopen |
| BEH-006 static URL top-level | Changed | REQ-005, AC-005 | Server unit test (IMP-03) + top-level browser probe |
| Blob `<base>` | Removed | Design removal plan | IMP-02 asserts Blob = content only |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | Yes | Static route reply header | IMP-03 (`fastify.inject`) | Real browser honouring the header top-level | Browser top-level probe |
| Frontend component / state | Yes | `HtmlPreviewer` iframe sandbox, Blob bytes | IMP-02 (happy-dom) | happy-dom does not enforce sandbox semantics | Real Electron renderer |
| Browser integration / user journey | Yes | Preview in Files area, Artifacts | IMP-08 (harness, not the app) | Real app components, real node | Isolated desktop instance |
| Authentication / session / permissions | Yes | Node gate vs `Origin: null`; phone credential in `localStorage` | 403 server E2E (null Origin) | Real page-originated requests; phone app | Isolated instance + paired phone browser |
| Desktop renderer / web-equivalent UI | Yes | Preview in renderer | IMP-08 | Real renderer bundle | Isolated desktop instance |
| Desktop shell / Electron-specific integration | Yes (reach only) | Preload API reachability from a subframe | IMP-08 (stand-in preload) | Real preload (`electronAPI`) | Isolated desktop instance |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation`, branch `codex/html-preview-isolation`; code commit `cdba18ba35` (HEAD at start `2d59c0db2c`, docs-only commits since)
- Project type and runtime stack: pnpm monorepo; Nuxt/Vue renderer + Electron 42.11.16 desktop shell; Fastify/Mercurius node (`autobyteus-server-ts`)
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/TESTING.md` (no closer `TESTING*.md` under `autobyteus-web` or `autobyteus-server-ts`)
- Conflicting, missing, or unclear project instructions: none. TESTING.md browser-probe rule ("a probe owns its stack") applies to the phone probe; it attaches to the test-owned isolated instance's node instead of starting its own server (the instance is owned by this run).
- Changed build-input paths: `None` (`git diff --name-only ff68bfb5fa HEAD`: two source files, two specs, two docs, ticket folder); no fresh-start build case
- Required environment variables or secrets available: `N/A` (no provider keys; scripted AGY CLI)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, rules | Isolated desktop instance of a worktree build: `pnpm --silent isolated-app start --build`; never the user's app/data; stop what you started; assertions first; one heavy run at a time |
| `docs/isolated-app-instances.md` | Isolated instance lifecycle | `start` reports `instanceId`, `controlPort`, `backendUrl`, `logPath`; `--data-root` dir is ours and never deleted; embedded server reads the data root's own `.env`; control via CDP on `controlPort` |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts` | Instance server env | Isolated server gets only baseline env; settings from `<data-root>/server-data/.env` (used for `ANTIGRAVITY_CLI_COMMAND`) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Phone pairing pattern | `PUT /rest/remote-access/settings {phoneAccessEnabled}`, `POST /rest/remote-access/pairing-sessions {serverBaseUrl, trustedPrivateHttpAcknowledged}`; phone at private LAN host `192.168.77.10:<port>` routed to the node keeping Host/Origin; credential in `localStorage['autobyteus.remote_access.mobile_session']` |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted runtime | `GENERATE_IMAGE:<abs path>` writes a file and streams a generated-output artifact; `CALL_TOOL` for agent tools |
| `autobyteus-server-ts/tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts` | 403 durable gate test | Refuses `Origin: null` on `/ws/terminal/…` and `/graphql` before the route runs |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Isolated desktop instance (worktree build) | worktree root | `pnpm --silent isolated-app start --build --data-root <temp>/data-root` | Own ports, own data root under `$TMPDIR/api417.*` | `start` JSON `ok:true` (backend `/rest/health`, main window listed) | `pnpm --silent isolated-app stop <instanceId>`; remove temp root |
| Driver (Playwright over CDP) | temp scripts dir | `node <script> <controlPort> …` (`playwright-core` from `autobyteus-web/node_modules`) | Attaches to the instance window | main window page found | disconnect only |
| Phone browser | temp scripts dir | headless Chrome via `playwright-core`, private-LAN origin routed to the instance node | Own browser context | pairing → run tree | close browser |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Synthetic workspace with hostile/test pages, relative JS/CSS/PNG, module, JSON, font | Files written to `<temp>/workspace` (from IMP-08 pages, extended) | Synthetic only (QR-002) | Temp root removed after run; pages kept in evidence |
| Agent definition + AGY run with workspace | Public GraphQL (`createAgentDefinition`, `createAgentRun`) on the instance node | Scripted runtime, no model, no keys | Instance data root removed |
| HTML artifact | AGY `GENERATE_IMAGE:<path>` through a temp copy of the fixture that writes `<path>.next` content when present (one-line change; repository fixture writes fixed bytes) | Temp harness only | Removed with temp root; copy kept in evidence |
| Phone credential | Phone Access pairing through the node's REST API | Test-owned node | Removed with data root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/fileExplorer/viewers/__tests__/HtmlPreviewer.spec.ts` | Sandbox exactly `allow-scripts` on both paths; Blob = content only; revoke; local absolute path → Blob | AC-001; DS-001/002 | Still Valid | IMP-02, IMP-04 (fails on base) | Reuse IMP-02 |
| `autobyteus-server-ts/tests/unit/api/rest/workspaces.test.ts` (`preview document sandbox`) | Header on HTML and CSS static replies; none on static 400/404 and `/content` | AC-005 (server part) | Still Valid | IMP-03, IMP-04 | Reuse IMP-03 |
| `autobyteus-server-ts/tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts` | Node refuses `Origin: null` WS upgrades (incl. `/ws/terminal/…`, `/graphql`) before the route runs; terminal `connect` never called | AC-003 (node side) | Still Valid (403's, unchanged) | file read | Run once on this commit (API-06) |
| `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` | Static route status/type/body | REQ-004 (served unchanged) | Still Valid (header does not affect its assertions) | code review | Reused via IMP-05 neighbourhood; not rerun |
| Web neighbour specs (`components/fileExplorer`, `agents`, `workspace/agent`, `applications`, `mobile`) | Viewers, `ApplicationIframeHost`, mobile views | AC-008 | Still Valid | IMP-05 | Reuse IMP-05 |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 | Web component | Reused | IMP-02 | Ran on `cdba18ba35`; no code change since (`git diff --name-only cdba18ba35 HEAD` = ticket docs only) |
| API-02 | AC-005 (server) | Static route | Reused | IMP-03 | Same commit; no code change |
| API-03 | AC-008 | Web neighbours | Reused | IMP-05 | Same commit; no code change |
| API-04 | — | Typecheck/guards | Reused | IMP-06, IMP-07 (the `--build` desktop build also reruns typecheck and guards) | Same commit |
| API-05 | AC-002 (harness), AC-004 (render), AC-007 | Electron with app webPreferences + real route code | Reused | IMP-08 | Same commit; supporting evidence only, the real app is API-10/11 |
| API-06 | AC-003 (node side) | Node gate, real server | Existing Test | `env -i PATH HOME=<resolved temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts --no-watch` | Durable proof that `Origin: null` is refused on `/ws/terminal` and `/graphql` |
| API-10 | AC-002, AC-003, AC-004, AC-007 | Real desktop app: Files-area workspace preview | Journey | Isolated instance; AGY run with the synthetic workspace; open the run, Files → `hostile.html` (preview); read the iframe's report through CDP | Real renderer, real preload, real node |
| API-11 | AC-002, AC-003, AC-004 | Real desktop app: Artifacts blob preview | Journey | Same run: `GENERATE_IMAGE` writes `artifact-hostile.html`; Artifacts → preview; read report | Blob path in the real shell |
| API-12 | AC-003 (control) | Node, allowed client | Temporary Probe | From Node (no Origin): same terminal WS with marker command, same GraphQL mutation | Proves the marker/definition detectors would see a success |
| API-13 | AC-004 (refresh) | Artifacts + Files area | Journey | Rewrite the artifact through the agent while previewed → updates; change the open workspace file → observe, reopen → new content | SR-004 AC-004 wording; CAND-04/R-3 measurement |
| API-14 | AC-005 | Static route top-level | Temporary Probe | Headless Chrome opens the static URL of `hostile.html` top-level; `curl -D-` of HTML/CSS/JS/PNG | Real browser honours the header; assets keep types |
| API-15 | AC-006 | Phone web app | Journey | Pair a phone browser (390×844) to the instance node at a private LAN origin; open the AGY run → ⋮ Artifacts → HTML artifact preview; read report | Phone credential present in `localStorage`, unreadable from the preview |
| API-16 | AC-007 | Docs | Temporary Probe | Read `file_explorer.md` / `content_rendering.md` at `cdba18ba35` against DEC-001 losses and API-10's measured losses | Docs part of AC-007 (release notes are delivery's) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None. Rationale: the regressions this change must prevent (re-adding `allow-same-origin`, dropping the header, a `<base>` back in the Blob) are pinned by the two updated specs (IMP-02/03, shown to fail on the base, IMP-04); the node's refusal of `Origin: null` is pinned by 403's server E2E (API-06). What the real-app journeys add is Chromium's enforcement of sandbox/CSP in this app's shell, which is platform behaviour, not repository logic; a durable packaged-app probe would need a full desktop build per run and a new `package.json` script (a build input). The journeys' harness is committed in the evidence folder so it can be rerun.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron 42.11.16, Nuxt renderer from `file://`, preload `electronAPI` on the main frame, embedded node
- Testing guideline, README, or development instructions used: `TESTING.md` (isolated desktop instance), `docs/isolated-app-instances.md`
- Web-equivalent behavior: preview rendering, node refusal (also proven for the phone web app, API-15)
- Shell-specific or lifecycle behavior: preload API unreachable from the preview subframe; `file://` app window not readable
- Chosen validation approach and why it fits the project: the worktree build in an isolated instance, driven through its CDP control port with Playwright; the preview iframe's own report is read from its frame (cross-origin frames are readable through CDP), plus node log, filesystem marker and GraphQL state
- Server/frontend setup when browser validation is used: the phone probe uses the instance's own node (`/mobile`), reached at a private LAN origin
- How the run avoids disturbing an already-running desktop application: separate isolated instance with own ports and data root; the user's app and `~/.autobyteus` are not touched; only our `instanceId` is stopped

## Live Environment And Fixture Plan

- Startup order and commands: build+start isolated instance → write synthetic workspace (pages embed the node URL) → create AGY agent definition and run via GraphQL → drive desktop (API-10, 11, 13) → API-12 control → API-14 → pair phone, API-15 → stop instance
- Environment choices that materially affect the run: `<data-root>/server-data/.env` sets `ANTIGRAVITY_CLI_COMMAND` to the temp fixture copy; no provider keys
- Health / readiness checks: `isolated-app start` readiness; `/rest/health`
- Seed data / fixtures: synthetic pages only
- Test identities, authentication, permissions, or session state: phone credential from a real pairing on the test node
- Requirement-linked journeys or scenarios: SCN-001, SCN-002, SCN-004, SCN-A1…A4
- Evidence to capture: per-frame JSON reports, node log excerpts (`REMOTE_ACCESS_ORIGIN_REFUSED`, terminal attach lines), marker-file checks, GraphQL definition lists, iframe DOM attributes, screenshots
- Owned processes and temporary state to clean up: isolated instance, headless Chrome, temp root (workspace, data root, scripts)

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| SCN-003 local absolute-path HTML as its own journey | Same `HtmlPreviewer` blob branch as artifacts (API-11) and covered by IMP-02; its trigger (an Event Monitor file link) needs a run whose tool events carry an absolute path | Low | No | None |
| Team/collaboration reference previews | Same component and blob branch as artifacts | Low | No | None |
| Real iOS/Android phone | Phone web app tested in Chrome with mobile emulation; iOS Safari/WebView enforces the same HTML sandbox standard | Low | No | None |
| Windows/Linux desktop | Not this host | Low (Chromium behaviour) | No | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| CAND-04 / R-3 workspace preview does not auto-reload | Resolved upstream (SR-004, FU-003); measured here only. Measured in API-13: it does reload by itself (watcher → `invalidateFileContent` → `FileViewer` loading state remounts `HtmlPreviewer`). Not a defect and no reroute: AC-004 as worded is met; FU-003's premise is contradicted (report Notes) | `requirements-doc.md` AC-004 (SR-004); `evidence/api-e2e/API-13-refresh.txt` | Solution Designer (evidence-only; carried in the handoff) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: SR-004 doc changes are uncommitted in the worktree (Solution Designer's); validation uses them as the current basis. Execution deviations (AGY case setting, phone at the node's real LAN address) are recorded in the execution report § Round.
