# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts: `probes/large-upload-probe.integration.test.ts.txt`, `probes/probe-results-2026-11-15.txt`, `follow-ups.md` (FU-001..FU-004), `handoff-sr-001..003.md`, `GLOSSARY.md` "Context Files"
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass; CR-001 minor, not blocking)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: code review pass (CRR-001) of IR-001, Large + High route; message from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file

All paths are in `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload/tickets/in-progress/context-file-large-video-upload/`. Tested worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload`, branch `task/context-file-large-video-upload`, code commit `80f958bc5`, handoff commit `8004c285b` (no source change between them), base `origin/personal` @ `3d738de6e`.

## Current Requirement And Design Basis

Audio/video context files attach up to a node setting (default 2048 MiB), every other file up to 25 MiB (setting). The server refuses with typed 413/415 answers carrying the limit in bytes; the web refuses over-limit files before sending, shows progress and a cancel control, and shows one localized line per reason (per limit for size) with no raw server text. Project Task uploads and the agent tools' local copies share the policy. The native runtime does not inline a local media file over 25 MiB. `/upload-file` stays 25 MiB. Nothing half-written stays on disk after over-limit, cancel or disconnect. Streaming keeps memory flat. Both settings are read per operation and apply with no restart. Release rule RC-001 (with or after Memory Sync Task `autobyteus-workspace-7`) is delivery's.

The implementation handoff leaves open exactly the live-system items the code review repeated: the phone bundle, a real 1–2 GiB upload with memory sampling, the lowered-limit race (AC-006), a settings change and its refusal on save through Server Settings, the phone credential reading `GET /rest/context-files/size-limits`, zh-CN in a browser, a real native turn with a video over 25 MiB, a dropped connection mid-upload.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001, SCN-002, SCN-003, SCN-004, SCN-005 (reused unit), SCN-006 (reused unit; live part not testable here), SCN-007 (route/unit reused; a real Project Task upload is covered through the built server), SCN-008.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - A phone user (paired with a credential, not the owner credential) picks a video over 25 MiB in the phone composer: the credential gate lets `GET /rest/context-files/size-limits` and the multipart upload through (trigger: the phone page).
  - The owner lowers a limit in Server Settings while a composer is open; the client's limits were read at its last pick, so the next pick must see the new value without reload, and an upload that began on the stale limit must still be refused by the server (trigger: Server Settings save, then a pick).
  - The owner types an invalid value in Server Settings (trigger: the save control).
  - A phone loses the network mid-upload (trigger: the browser goes offline during a throttled upload).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 per-type limits, streaming | Changed | design-spec, IMP-02 | Reused in-process integration; repeat on the built server with the real node gate and real settings storage, plus a 1.5 GiB streamed upload with RSS sampling and a >2 GiB refusal |
| BEH-002 / BEH-009 localized lines | Changed | IMP-06, IMP-10 (en-US, desktop) | Reused unit; add zh-CN and the phone bundle |
| BEH-003 no half-written file | Changed | IMP-02, IMP-10 | Reused; add built-server drop and cancel-on-phone cases |
| BEH-004 streaming | Preserved | P2, IMP-02 (300 MiB) | 1.5 GiB on the built server (gated) |
| BEH-005 / BEH-006 draft TTL, finalize, path | Preserved | IMP-03 | Reused for the TTL; finalize on the built server after a large upload (the path reaches the agent) |
| BEH-007 inline cap | Changed | IMP-05 | Reused unit; live Gemini turn cannot run here (no test vault) |
| BEH-008 Project Task | Changed | IMP-01/02/03/06 | Reused; one built-server Project Task upload |
| BEH-010 `/upload-file` 25 MiB | Preserved | IMP-03 | Reused |
| Size-limits endpoint / node access | Added | design-spec | Phone credential, owner credential, no credential on the built server |
| Settings (two keys) | Added | `context-file-size-limit-settings.ts` | Built server: env at start, GraphQL save, invalid refused, no restart; Server Settings page in a browser |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | writer, policy, settings | IMP-01, IMP-02 | Settings storage through the real GraphQL/`.env` path; env at process start | Built server e2e (new) |
| API / transport / contract | Yes | two typed errors, size-limits route | IMP-02 in-process fastify, plugin without limits | Production composition (`buildStudioServer`) and its real multipart registration; a real GiB-size body | Built server e2e (new), gated large upload (new) |
| Frontend component / state | Yes | composable, store, error-lines component | IMP-06 | Rendering in zh-CN; phone WebView layout | Phone-bundle browser cases (new) |
| Browser integration / user journey | Yes | pick, progress, cancel, grouped lines | IMP-10 (desktop en-US, a 6 MiB video, stubbed limits in part A) | A real video over 25 MiB; real limits; zh-CN; settings change; lowered limit race | New phone cases, new desktop case CF-014 |
| Authentication / session / permissions | Yes | new GET route and upload under a phone credential | `node_access` unlisted-route rule (reading) | Never run with a phone credential | Built server e2e (new), phone cases |
| Desktop renderer / web-equivalent UI | Yes | composer | IMP-10 | Server Settings UI path | CF-014 |
| Desktop shell / Electron-specific integration | No | none | N/A | None (no preload/IPC/window change) | None |
| Process / lifecycle | Yes | drain, abort, cancel | IMP-02, IMP-12 | Real network drop in a browser; dropped socket on the built server | Built server e2e, phone cases |
| Persisted-data transition | No (`Not Affected`) | none | N/A | None | None |
| Worker / queue / distributed coordination | No | none | N/A | None | None |
| External integration | Yes | Gemini inline cap (autobyteus-ts) | IMP-05 | A real provider turn with a >25 MiB video | Live runtime: blocked (see Not Tested) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload`
- Project type and runtime stack: pnpm monorepo; Node v26.12.0; Fastify server (`autobyteus-server-ts`), Nuxt web (`autobyteus-web`), core library (`autobyteus-ts`); Vitest; Playwright-core browser probes
- Project testing guideline path(s): `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload/TESTING.md` (root; no closer `TESTING*.md`)
- Conflicting, missing, or unclear project instructions: `pnpm` is not on this machine's PATH; I used a shim (`/tmp/api-e2e-ws6/bin/pnpm` → `npx pnpm@10.28.2`). TESTING.md's web typecheck fails on the base here (known, IMP-09). The test vault is not set up (`pnpm test-vault status`: `TEST_VAULT_NOT_FOUND`); only the user sets it up, so no live provider run.
- Changed build-input paths (`git diff --name-only 3d738de6e...HEAD` against the guideline's list): none that the list names (the diff touches server/web/autobyteus-ts source, docs and tests; no manifest, lockfile, tsconfig, script, `nuxt.config.ts`, Prisma, Docker, contract package or workflow). Fresh-start build case: not required.
- Required environment variables or secrets available: no provider secret needed for the planned cases; the real-provider case is `Blocked`/user-only (see below)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, environment and data rules | Built-server e2e via `test-support/live-e2e` helpers (`startBuiltTestServer` attaches the owner credential); server e2e folders inherit the shell, so run with `env -i PATH HOME=<temp>`; one heavy run at a time; never test against the user's node; probes own their stack and need `AUTOBYTEUS_ALLOWED_ORIGINS`; renderer behavior the phone offers is proven on the phone bundle too |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` and `mobile-file-open-cases.mjs` | Phone bundle probe and its cases-file pattern | Cases files are run by `runCases()` after the main cases; a case set builds its own nodes (`serverAt`), pairs a phone through Phone Access in a headless Chrome mapping `192.168.77.40` to loopback, 390×844 |
| `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | Desktop composer probe | Real Nuxt dev + built backend + headless Chrome; CF-013 is the implementation's case |
| `autobyteus-server-ts/tests/e2e/helpers/built-server-launch-credential.ts`, `test-support/node-access/*` | Node credential attachment | The owner credential attaches to `fetch`/`http.request` for the started node's port |
| `autobyteus-server-ts/package.json` | Scripts | `build` = `build:full`; e2e files run with `vitest run <path> --no-watch` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built server (test-owned data root, free port) | worktree | `startBuiltTestServer` (spawns `autobyteus-server-ts/dist/app.js --data-dir <test root>`) | Built at `80f958bc5` (rebuilt this round: `evidence/API-00-build-server.log`) | "Server listening on" marker | `server.stop()`; test root removed |
| Mobile bundle (`autobyteus-web/dist/public`) | worktree | `pnpm -C autobyteus-web build:mobile-web` | needed by the mobile-shell probe | `/mobile` served by the probe's alpha | Build output is untracked and left |
| Nuxt dev frontend + backend + Chrome | worktree | owned by `composer-context-file-removal-probe.mjs` | process groups removed in `finally` | probe's own | probe's `finally` |
| Disk | n/a | n/a | the 1.5 GiB and >2 GiB cases need ~2.5 GiB free in `autobyteus-server-ts/tests/.tmp`; 3.1 TiB free | `df` | the test removes its root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Large video bytes | generated on the fly by the test (streamed zero-copy pattern; no file kept) | none | none |
| Phone credential | `POST /rest/remote-access/pairing-sessions` then `pairing-exchanges` (as CF-001 does) | credential never printed or stored in evidence | node removed |
| Setting changes | GraphQL `updateServerSetting` on the test node | test data root only | node removed |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected` (design-spec "Persisted Data / State Transition Decision"; handoff Persisted Data Transition Check).
- Observed in this round: no stored shape changed; existing drafts and finals are read by the unchanged readers (IMP-03). Nothing further planned.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/api/rest/context-file-size-limits.integration.test.ts` | per-type limits at/+1, typed refusals, drain, abort, memory 300 MiB, Project Task route, `/upload-file` | AC-002, 003, 004, 007, 008, 012, 013, 015 | Still Valid | IMP-02 (15 passed); no server source change since | Reuse |
| `autobyteus-server-ts/tests/unit/config/context-file-size-limit-settings.test.ts`, writer/store/service unit tests | policy, settings parse, writer boundary | AC-002, 003, 004, 012 | Still Valid | IMP-01 (615 passed) | Reuse |
| `autobyteus-ts/tests/unit/llm/utils/media-input-sanitizer.test.ts` | 25 MiB inline cap boundary, three media kinds, URLs and data URIs untouched | AC-011 | Still Valid | IMP-05 | Reuse |
| web specs (composable, component, store, utilities, Project Task client/composable) | pre-check, grouping, cancel, localized lines, reported-string regression | AC-005..009, 012 | Still Valid | IMP-06 at `80f958bc5` (HEAD code) | Reuse |
| `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` CF-013 | desktop, en-US, stubbed limits (part A), a 6 MiB video, throttled cancel | AC-001, 005, 007 | Still Valid, narrower than needed | IMP-10 | Reuse; add CF-014 for the Server Settings path and zh-CN |
| `autobyteus-server-ts/tests/integration/api` REST suites, `tests/e2e/projects` | preserved context-file and Project Task behavior | AC-012, 013 | Still Valid | IMP-03 | Reuse |
| `mobile-shell-probe.mjs` MSP-28 | phone attaches PNG, PDF, text; viewer opens | preserved | Still Valid (different subject) | handoff | Not rerun; new cases added beside it |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-002, 003, 004, 012; BEH-001, 003, 008 | Server unit | Reused | `IMP-01` | server `src` unchanged since `5fad14c5a` (`git diff --name-only 5fad14c5a HEAD` lists only two web files) |
| API-R02 | AC-001..004, 007, 008, 012, 015 | Server in-process HTTP | Reused | `IMP-02` | same |
| API-R03 | AC-012, 013; BEH-005, 006, 008, 010 | Server REST + Project Task e2e | Reused | `IMP-03` | same |
| API-R04 | typing | Server typecheck | Reused | `IMP-04` | same |
| API-R05 | AC-011 | autobyteus-ts unit | Reused | `IMP-05` | `autobyteus-ts` unchanged since `5fad14c5a` |
| API-R06 | AC-005..009, 012 | Web unit | Reused | `IMP-06` | ran at `80f958bc5`, the tested code commit |
| API-R07 | localization | Web guards | Reused | `IMP-08` | ran at `80f958bc5` |
| API-01 | AC-001, 002, 003, 004, 006 (server side), 007, 008, 010-adjacent, 012, 013; REQ-002, 004; QR-002, QR-004 | Built production server over real HTTP, node gate, real settings storage | Durable | `cd autobyteus-server-ts && env -i PATH=… HOME=<temp> vitest run tests/e2e/context-files/context-file-size-limits-built-server.e2e.test.ts --no-watch`. Starts `dist/app.js` with `AUTOBYTEUS_CONTEXT_FILE_AUDIO_VIDEO_MAX_MB=8`, `…OTHER_MAX_MB=2`. Sub-cases: (a) env limits at start; at-limit accepted, +1 refused 413 with `maxBytes`, for video and PDF; (b) `GET size-limits` with owner credential, with a paired phone credential, with none (refused); (c) phone credential uploads a video; (d) `updateServerSetting` lowers the video limit with no restart: the next upload and `size-limits` use it; an upload the earlier limit allowed is refused 413 (the lowered-after-pick server answer, AC-006); (e) invalid values refused on save (`0`, `abc`, `10241`) and the value unchanged; (f) unsupported type 415; (g) connection dropped mid-body: no file on disk, server still serves; (h) a large draft is read back whole at its locator with the sent SHA-256 (finalize needs an admitted run, so finalize and the agent's path are proven by MSP-53, which sends the message); (i) `/upload-file` 26 MiB refused; (j) over-limit leaves no file under the data root | Closes the production-composition, settings-storage and credential-gate gaps the in-process tests cannot |
| API-02 | AC-001, AC-015, REQ-001, QR-001 | Built server, default limits, real GiB bodies | Durable (gated `RUN_LARGE_CONTEXT_FILE_E2E=1`) | `RUN_LARGE_CONTEXT_FILE_E2E=1 env -i … vitest run tests/e2e/context-files/context-file-size-limits-built-server.e2e.test.ts -t "large" --no-watch`. A 1.5 GiB (`LARGE_CONTEXT_FILE_E2E_MIB`, default 1536) video streams; the server process RSS is sampled every 250 ms (`ps -o rss=`); the stored file's size and SHA-256 equal the sent bytes; finalize path; a 2 GiB + 1 MiB video is refused 413 with `maxBytes` 2147483648, no file left, RSS bounded, server healthy after | The one thing no in-process run showed: real GiB size at the default limit, with the real process's memory |
| API-03 | AC-001, AC-005, AC-006, ASM-001 (desktop-browser part), REQ-005..008, QR-002 | Phone bundle, 390×844, zh-CN, own node | Durable | `node tests/e2e/mobile-shell-probe.mjs --cases=MSP-53,MSP-54,MSP-55 --output-dir=<fresh>` (new `mobile-context-file-size-cases.mjs`): MSP-53 a 26 MiB video on default limits attaches with visible progress (the upload paced by a TCP forwarder in front of the node), is stored in full (size equal), the page's `File.type` is `video/mp4`, the message sends, the scripted AGY CLI's `context_files` case records the agent's input (the absolute path under `Reference files:`) and opens the whole file (SHA-256 equal); MSP-54 lowered limits: a video and a PDF over their limits show two zh-CN lines naming the files and each limit, no upload request; a stale limits answer (route stub of the client's read only) lets the file through and the server's 413 shows the same line (AC-006); MSP-55 cancel mid-upload and a link drop mid-upload (the forwarder resets every connection and refuses new ones, as a phone losing its network; Chrome retries a POST once on a reset reused connection, so a single reset is not a drop): no message for cancel, zh-CN "interrupted" for the drop, no draft file on the node, Send unblocked | Phone bundle proof TESTING.md requires; zh-CN; real 26 MiB |
| API-04 | AC-004, REQ-002, REQ-005, AC-005 | Desktop browser, Server Settings page, composer | Durable | `node tests/e2e/composer-context-file-removal-probe.mjs --cases CF-014 --output-dir=<fresh>` (new case CF-014): open Server Settings, save a valid audio/video value, see it persisted; save an invalid value, the page shows the refusal and the stored value is unchanged; with a composer open, the next pick (no reload) refuses a file by the new limit in zh-CN | The settings-through-UI journey the handoff lists |
| API-05 | AC-011, REQ-010, QR-003 | autobyteus-ts built output | Temporary Probe | node script importing `autobyteus-ts/dist/llm/utils/media-input-sanitizer.js`: real 26 MiB video, audio, image files and a 25 MiB one on disk; observe which sources survive and the diagnostic | Shows the real built module, not the TS source under vitest; unit test already durable (IMP-05) |
| API-06 | AC-011, SCN-006 | Native runtime, real provider turn with a video over 25 MiB | Journey | `AUTOBYTEUS_TEST_VAULT=… RUN_…=1` on a Gemini-class model | `Not Tested`: no test vault (`TEST_VAULT_NOT_FOUND`); only the user sets one up |

| API-07 | AC-014, REQ-012 | Documentation | Journey | read the three docs the handoff lists | added during execution: AC-014 is a doc review |
| API-08 | typing | Server typecheck | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | added during execution: the new test file must not grow the baseline |
| API-09 | node-credential and import rules | Server architecture tests | Existing Test | `pnpm exec vitest run tests/architecture --no-watch` | added during execution: the new e2e file must follow the credential-path and tracked-import rules |
| API-R08 | AC-001, 005, 007, 009 | Desktop browser probe | Reused | `IMP-10` | the probe changed only by the added CF-014 |

- Test progress log needed (more than one case, or a case that runs long): `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01, API-02 | `autobyteus-server-ts/tests/e2e/context-files/context-file-size-limits-built-server.e2e.test.ts` (API-02 gated) | Production-server proof of the policy, settings, credential gate and drop/limit-lowering paths; the gated large-body case keeps the memory proof repeatable |
| API-03 | `autobyteus-web/tests/e2e/mobile-context-file-size-cases.mjs` (wired into `mobile-shell-probe.mjs`, MSP-53..55) | TESTING.md: renderer behavior the phone offers is proven on the phone bundle |
| API-04 | `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` (CF-014) | Server Settings → next pick, in the existing composer probe |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-03 | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | header comment (cases, run time) and a call to the new cases file | no assertion of an existing case changes |
| API-04 | `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | add CF-014 to the case list and header | CF-013 unchanged |
| API-01 | `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload/TESTING.md` | none unless a general rule is learned (decided at the end) | |

## Durable Coverage To Remove

None. No stale assertion found: the old-constant and raw-text assertions were already updated by the implementation (CF-008, tests of the removed constant).

## Desktop Application Validation Plan (When Applicable)

- Desktop framework / shell: Electron (not changed here).
- Testing guideline, README, or development instructions used: TESTING.md "Choosing the path" (renderer UI → web unit + browser probe).
- Web-equivalent behavior: composer and Server Settings page (browser probe, API-04); phone bundle (API-03).
- Shell-specific or lifecycle behavior: none changed; no preload, IPC, window or packaging code is in the diff.
- Chosen validation approach and why it fits the project: browser probes with their own stacks; no isolated desktop instance needed because no shell code changed.
- Server/frontend setup when browser validation is used: owned by the probes (private data root, free ports, `AUTOBYTEUS_ALLOWED_ORIGINS`).
- How the run avoids disturbing an already-running desktop application: probes use their own roots and ports and never touch `~/.autobyteus`.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order and commands: build the server (done), build the phone bundle (`pnpm -C autobyteus-web build:mobile-web`), then API-01, API-02, API-05, API-03, API-04, one heavy run at a time.
- Environment choices that materially affect the run: `env -i PATH HOME=<resolved temp> TMPDIR` for the server e2e; probes as documented.
- Health / readiness checks: the start helpers' readiness markers.
- Seed data / fixtures: generated bytes, scripted AGY CLI for the phone's agent run.
- Test identities, authentication, permissions, or session state: owner credential from the helpers; a paired phone credential (never printed).
- Requirement-linked journeys or scenarios: see Planned Cases.
- DOM, screenshot, log, API, process, or other evidence to capture: test output, RSS samples, probe JSON and screenshots, disk listings.
- Owned processes and temporary state to clean up: built servers, Nuxt dev server, Chrome, test data roots.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| ASM-001 on a real phone (the `File.type` a phone's camera or gallery gives a recorded video) | No Android SDK, emulator or device on this machine (`adb`, `emulator`, `avdmanager` absent; no `~/Library/Android/sdk`), and the Android app is not in the diff. Headless Chrome derives `File.type` from the extension, which proves the classification path, not the phone's value. The server stays the authority: a wrong client type at worst pre-checks with the wrong limit, and the server refuses or accepts by its own multipart type. | Low | Yes (delivery takes it to the user: attach a recorded video larger than 25 MiB from the phone and confirm it attaches) | Delivery |
| Real native-runtime turn with a >25 MiB video on a video-capable model (AC-011 live) | The test vault is not set up on this machine (`pnpm test-vault status`: `TEST_VAULT_NOT_FOUND`); only the user sets it up. A model request cannot be made without a key. | Low: the sanitizer unit tests (IMP-05) and the built-module probe (API-05) show the video is dropped from the request's media | Yes | Delivery tells the user; not a blocker for `Pass` (the provider rule is a size guard, proven at the module that builds the request) |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| None found while planning | N/A | N/A | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: built-server e2e file; phone cases file; CF-014; updated: the two probe headers/wiring)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: reused checks are valid because `git diff --name-only 5fad14c5a HEAD` outside the ticket folder lists only `ContextFileErrorLines.vue` and `ContextFilePathInputArea.vue`, which IMP-06/IMP-08/IMP-10 reran at `80f958bc5`.
