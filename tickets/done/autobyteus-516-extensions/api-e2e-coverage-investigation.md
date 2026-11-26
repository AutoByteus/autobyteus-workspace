# API/E2E Coverage Investigation — autobyteus-516 Stage 1 (extension foundation, Voice Input)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md).

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-006; DEC-015…DEC-019)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-007/SR-008, plus `ExtensionList.platform`)
- Supplemental Task Artifacts: `extension-contract.md` (parts 1–7), `use-case-spines.md` Part V, Product UI spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/ui-ux-spec.md` (VIS-V*)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `N/A` (first round; becomes `API-REV-001`)
- Current Investigation Round: 1
- Trigger: code review CRR-002 Pass (`/code_reviewer`, 2026-11-26)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this document, round 1

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/tickets/in-progress/autobyteus-516-extensions/`. Code under test: branch `codex/autobyteus-516-extensions` @ 3961790ab6 (code), base `origin/personal` @ fdde5406fa; extensions repository `/Users/normy/autobyteus_org/autobyteus-extensions` @ 4d00904.

## Current Requirement And Design Basis

- Every node has one Extension Manager (signed catalog, package installer, server-part host, `state.json`, log). Owner-only GraphQL and `/rest/extensions/:id/{actions,ui}` (REQ-001…REQ-005, REQ-009, REQ-011).
- Voice Input 1.0.0 (wrapping voice runtime 0.3.2) is offered only on the desktop's own node and used by every window (REQ-006, REQ-008, REQ-011, REQ-012). Dictation from a window of any node posts the WAV to the embedded node (DS-004).
- The old desktop install `<base data folder>/extensions` is deleted once in the background at desktop start; failure logged and retried (REQ-007, DEC-016, DS-008).
- The Extensions page lists the extensions of the window's node; Update keeps On and settings, a failed update keeps the old version working with "Update to x failed: …" (AC-003).
- The extension page runs in a sandboxed frame; it reaches only its own server part through the bridge; the packaged desktop attaches the owner credential by origin (AR-003: page check through the real attacher and the packaged `file://` origin).
- QR-002: warm transcription of the same 5 s clip no more than 0.5 s slower than the base path.
- Release blocker outside this stage (with the Solution Designer): the built-in catalog public key is empty; every check here uses a development catalog signed with a throwaway key (the documented developer override, `AUTOBYTEUS_EXTENSIONS_CATALOG_URL` / `_PUBLIC_KEY`).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001…SCN-008. SCN-009 (docs) was reviewed by code review (AC-012); not executable.
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1 (from SCN-004 + SCN-002): the founder's real upgrade order: the new version starts on a data root holding the old install; the node then gets a catalog, and Voice Install is done from the card in the packaged window. Trigger: app start, then the card's Install.
  - SCN-A2 (from SCN-002/SCN-003): after an Update, the next dictation goes to the new package's worker; exactly one worker process runs (the old module's worker was stopped). Trigger: Update on the card, then the Test.
  - SCN-A3 (from SCN-006 + SCN-008): on a Linux node, an every-node extension installs, its page reaches its own server part through the bridge on that node, and an extension whose `status()` fails shows Failed beside a working one. Trigger: card actions in a desktop window bound to a Docker node.
  - SCN-A4 (from SCN-005): the remote node's window keeps its button after the window regains focus while Voice Input stays On, and loses it after Off in the main window (focus re-read). Trigger: window focus.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): SCN-X1 (two windows transcribing at the same moment, code review).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 list and lifecycle of the window's node | Added (replaces Electron manager) | design DS-001…DS-003 | Real node through the page: browser probe, packaged window, Docker window |
| BEH-002 transcription by the embedded node's Voice Input | Changed (IPC → node route) | DS-004, DS-007 | Real runtime through the page (probe, packaged); QR-002 before/after |
| BEH-003 five voice surfaces gated on installed+on+ready | Changed (gate source) | DS-004 | Existing voice probes (composer lifetime, Projects voice cases); Memory search in the probe |
| BEH-004 remote node window uses this computer's voice | Preserved (new transport) | REQ-008, AC-009 | Packaged desktop + Docker node window |
| BEH-005 headless node lists its own extensions | Added | REQ-001, AC-010, AC-004 | Docker node (linux-arm64) from a packaged window |
| BEH-006 owner only | Added | REQ-005, AC-006 | Unit (NAS-42/43, reused); whole server E2E (gate changed); spot check on the Docker node |
| BEH-007 old install deleted once | Added (discard) | DEC-016, AC-008 | Packaged instance with a synthesized old install, failure and retry |
| BEH-008 broken extension contained | Added | REQ-009, AC-011 | Unit (reused); a failing-status extension on the Docker node through the page |
| BEH-009 docs | Added | REQ-010 | Reviewed (AC-012) |
| Removed Electron extension manager, IPC, preload members | Removed | removal plan | Packaged launch-profile probe; fresh-start build (typecheck, packaging) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `src/extensions/**` | IMP-01 unit (manager, parts, routes), IMP-04 negative controls | Linux platform, real Update path with real packages | Docker node; probe update cases |
| API / transport / contract | Yes | GraphQL `extensions*`, `/rest/extensions/:id/actions`, `/ui/*` | IMP-01 route tests (inject) | Real gate on a running node; every other route still gated as before | Whole server E2E; real nodes |
| Frontend component / state | Yes | page, card, frame, bridge, stores | IMP-05 web suite | Real node data, polling, focus re-read | Browser probe; packaged window |
| Browser integration / user journey | Yes | Settings → Extensions, voice surfaces | IMP-R probe (8 cases) | Update journey (AC-003); composer / Projects voice probes not rerun | Probe with update cases; voice probes |
| Authentication / session / permissions | Yes | route table owner action; resolver owner check; desktop attacher | NAS-42/43 unit; probe's browser-context stand-in | Real packaged attacher for frame subresources and action posts to two node origins | Packaged instance |
| Desktop renderer / web-equivalent UI | Yes | same renderer | probe | `file://` origin, CSP through the real node | Packaged instance |
| Desktop shell / Electron-specific integration | Yes | removed IPC/preload; deletion step at start; node windows | electron suite (IMP-06, IMP-09) | Packaged start with old data; launch profile after the plan key removal | Packaged instance; `test:e2e:electron` |
| Process / lifecycle | Yes | worker start at node start, stop on Off/Update/shutdown | unit, real-release test | Exactly one worker after Update; worker after restart | Probe + packaged checks of worker processes |
| Persisted-data transition | Yes | discard `<base>/extensions` | runner spec (synthesized) | Real packaged start order, failure and retry | Packaged instance |
| Worker / queue / distributed coordination | Yes | two nodes: window node vs embedded node | unit (store uses embedded entry) | Real second node | Packaged + Docker |
| External integration | Yes | catalog + package download, runtime release, Hugging Face | IMP-03 real-release | Docker container reaching the catalog; broken release URL | Docker; probe U2 |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions`
- Project type and runtime stack: pnpm monorepo; Node 22.23.1 (`node -v`); Fastify/GraphQL server (`autobyteus-server-ts`), Nuxt 3 + Electron 42 desktop (`autobyteus-web`); macOS arm64 host (10 cores, 64 GB); Docker 29.0.1 arm64.
- Project testing guideline path(s): `TESTING.md` (root; no closer `TESTING*.md` on the changed paths). Also `DESIGN.md` rule 12, `RELEASE.md` "Build-only release run", `docs/isolated-app-instances.md`.
- Conflicting, missing, or unclear project instructions: the packaged isolated instance's embedded node receives only a baseline environment, so the catalog variables cannot come from the shell; per `serverRuntimeEnv.ts` ("settings then come from the isolated data root's own `.env`") they are written into the instance's `server-data/.env`, which the desktop writes only on first run (`AppDataService.ts:108-111`) and the server loads at start (`app-config.ts:237`).
- Changed build-input paths: `autobyteus-server-ts/package.json`, `autobyteus-web/package.json`, `autobyteus-web/nuxt.config.ts` (typecheck exclude), `autobyteus-web/tsconfig.cross-package-tests.json` (a test added to a typecheck project that compiles server source), `autobyteus-web/typecheck-baseline.json`, `autobyteus-web/generated/graphql.ts`. → Fresh-start build (API-05) and, under DESIGN.md rule 12 ("a test added to a project that a type check … compiles"), the build-only release run (API-15).
- Required environment variables or secrets available: N/A (no provider keys needed; the catalog key is throwaway, generated per run).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, Choosing the path | layers | node request gate change → whole `pnpm test:e2e`; renderer → probe; shell → isolated instance; GraphQL ops → demo coverage spec + `autobyteus-ios/scripts/prepare-demo-web.sh --build` |
| `TESTING.md` § Fresh-start build | build inputs | `git clone --no-local`, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with the release env, then "Verify bundled Prisma" / "Verify packaged terminal runtime" |
| `TESTING.md` § Environments … Docker server nodes | Docker | test-owned container, `127.0.0.1:<port>`, fresh anonymous volumes, this worktree's server package mounted read-only over `/opt/autobyteus/server-package`; `docker rm -f -v` |
| `TESTING.md` § Browser probes | probe stack | `AUTOBYTEUS_ALLOWED_ORIGINS`, launch credential, fresh `--output-dir` |
| `docs/isolated-app-instances.md` | packaged desktop | `pnpm --silent isolated-app start --from-worktree --data-root <own dir>`, `stop`, `restart`; CDP on `controlPort` |
| `DESIGN.md` rule 12, `RELEASE.md` § Build-only release run | gate change | `pnpm release:test --ref <ticket-branch>` (about 25 min); push the ticket branch first (`scripts/check_secrets.sh`) |
| `autobyteus-web/tests/e2e/extensions-page-probe.mjs` header | probe | `--extensions-repo=<checkout>`, needs `say`, `ffmpeg`, network (~2 GB) |
| `autobyteus-server-ts/tests/real-release/voice-input-extension.real-release.test.ts` | real release | gate `AUTOBYTEUS_VOICE_INPUT_REAL_E2E=1` + catalog variables |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Development catalog server (throwaway Ed25519 key) | ticket `probes/api-e2e/` | `node probes/api-e2e/dev-catalog.mjs` (packs voice-input 1.0.0, 1.0.1, a broken 1.0.2 and two test extensions; one catalog for the host, one for the container) | loopback + Docker host gateway | GET catalog 200 | kill; temp folder removed |
| Packaged desktop (worktree build) | repository root | `pnpm --silent isolated-app start --from-worktree --data-root <dir>` | own ports, data root, process group | `start` JSON `ok` | `isolated-app stop <id>`; data root removed by me |
| Docker node | repository root | `docker buildx build -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package --platform linux/arm64 --output type=local,dest=<dir> .`; `docker run -d -p 127.0.0.1:<p>:8000 -v <pkg>:/opt/autobyteus/server-package:ro -e AUTOBYTEUS_EXTENSIONS_CATALOG_URL=… autobyteus/autobyteus-server:beta` | anonymous volumes | `/rest/health` | `docker rm -f -v` |
| Probe-owned node + Nuxt dev + headless Chrome | `autobyteus-web` | `pnpm -C autobyteus-web test:e2e:extensions-page --extensions-repo=…` | ~2 GB download | probe's own | probe's own cleanup receipt |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Old desktop install (AC-008) | synthesized v2 + `audioInputDeviceId` `registry.json` (released shape, from the runner spec's fixtures), `voice-input/` with small stand-in files, `.DS_Store` | test-owned `--data-root`; never the founder's files | data root removed after the run |
| Owner credential for the Docker node | setup code from `node-access-cli.js setup-code` exchanged by the desktop's `connectNode` | code written to a mode-600 file, never printed | file deleted; container removed |
| Microphone in the packaged window | CDP-injected `getUserMedia` returning a Web Audio stream of a `say` clip (device emulation only; recorder, worklet, store, transport real) | no OS microphone permission involved | none |
| Catalog signing key | generated per run in memory | never written to the repository | gone with the process |

## Persisted Data Transition Coverage Basis

- Approved decision: `Discard or Rebuild` for `<base data folder>/extensions` (DEC-016); `<data dir>/extensions` is new data (`Not Affected`).
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: a test-owned data root with `extensions/registry.json` (v2 + device shape), `extensions/voice-input/` stand-ins and `.DS_Store`; after the packaged app's first start the folder is gone, the app and node start, Voice Input shows Not installed (once a catalog is reachable) and Install works; a second start logs nothing more.
- Evidence planned: packaged instance logs (`Removed the old desktop Voice Input install`), directory listings before/after, page state; failure variant with a non-writable subfolder (warning, start continues, deleted on the next start after the permission is restored).
- Migration-specific scenarios: N/A (discard).
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/extensions/*`, `tests/unit/api/rest/extensions-routes.test.ts` | manager lifecycle, parts, routes, NAS-42/43 | AC-001…AC-006, AC-011 | Still Valid | IMP-01 at 38058ec630; only a comment changed since | Reuse |
| `autobyteus-server-ts/tests/real-release/voice-input-extension.real-release.test.ts` | real install + transcription | AC-002, AC-007, REQ-012 | Still Valid | IMP-03 at 3982b0042e; server source since then changed in routes/catalog comment only | Reuse; real install is exercised again by API-04 and API-10 |
| `autobyteus-web/tests/e2e/extensions-page-probe.mjs` | page R1–R8 through a real node | AC-001/002/005/007 | Needs Update | covers no Update (AC-003) | Add U1/U2 update cases (API-04) |
| `autobyteus-web/tests/e2e/composer-voice-lifetime-probe.mjs` + fixture page | composer voice across Team events | AC-007 | Still Valid (changed by this ticket; not rerun by implementation) | handoff Checks Run has no row | Run (API-02) |
| `autobyteus-web/tests/e2e/projects-voice-cases.mjs` (in `projects-feature-probe.mjs`) | voice on Task / Project description | AC-007 | Still Valid (changed; not rerun) | same | Run (API-03) |
| `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs` | packaged launch profile paths | removal plan, CR-001 | Still Valid (expected key removed in IR-002; not rerun) | code review note | Run (API-06) |
| `autobyteus-web/client-data-migrations/__tests__/electron-file-runner.spec.ts` | deletion once, retry | AC-008 | Still Valid | IMP-05 | Reuse; packaged proof API-08/09 |
| `autobyteus-web/scripts/__tests__/mobileBuildChecks.spec.ts` | demo operation coverage | GraphQL ops | Still Valid | IMP-05 | Reuse; demo build API-07 |
| Server E2E (`autobyteus-server-ts/tests/e2e/**`) | every route through the node gate | REQ-005, QR-004 | Still Valid | one file run in IMP-02 | Whole suite (API-01) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001…AC-006, AC-011, BEH-006/008 | server unit + architecture | Reused | IMP-01 | Ran at 38058ec630; since then only a comment in `extension-catalog.ts` changed on the server |
| API-R2 | registerGraphql callers | server integration | Reused | IMP-02 | At d2934d630f; since then `rest/extensions.ts` (+2/−2) and a comment, which no integration test exercises (grep: no integration test reaches `/rest/extensions`) |
| API-R3 | AC-001…AC-008 (component level) | web suite | Reused | IMP-05 | Rerun on cc3094a0cb for the affected specs; since then only Electron files outside the Nuxt suite |
| API-R4 | removal plan | Electron main | Reused | IMP-06 + IMP-09 | IMP-09 reran the specs IR-002 changed |
| API-R5 | — | both typechecks | Reused | IMP-07 + IMP-09 | IMP-09 reran both on 3961790ab6 |
| API-R6 | AC-002, AC-007, QR-001 | extensions repository | Reused | IMP-08 | Repository unchanged (4d00904) |
| API-R7 | AC-002/003/006 guards | negative controls | Reused | IMP-04 | Guards unchanged since 38058ec630 |
| API-01 | REQ-005, QR-004 | node request gate, every route | Existing Test | `env -i PATH HOME=<temp> TMPDIR pnpm test:e2e` | TESTING: a change to the node's request gate runs the whole server E2E suite |
| API-02 | AC-007 (composer) | renderer voice lifetime | Existing Test | `pnpm -C autobyteus-web test:e2e:composer-voice-lifetime --output-dir <new>` | Changed by this ticket, not rerun |
| API-03 | AC-007 (Task / Project description) | renderer voice in Projects | Existing Test | `pnpm -C autobyteus-web test:e2e:projects --output-dir <new>` (voice cases inside) | Changed by this ticket, not rerun |
| API-04 | AC-001, AC-002, AC-003, AC-005, AC-007, REQ-012, SCN-A2 | page through a real node, real runtime | Durable (update) | `pnpm -C autobyteus-web test:e2e:extensions-page --extensions-repo=<…> --output-dir <new>` with new U1 (Update 1.0.0→1.0.1 keeps On + language, Test dictates with the new worker, one worker) and U2 (broken 1.0.2: "Update to 1.0.2 failed: …", Update still offered, the old version still dictates) | AC-003 had no executable proof; durable so the update path stays covered |
| API-05 | build inputs | fresh runner | Journey | fresh `git clone --no-local`, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with the release env, Verify bundled Prisma, Verify packaged terminal runtime | DESIGN rule 12 / TESTING Fresh-start build |
| API-06 | removal plan (CR-001) | packaged launch profile | Existing Test | `pnpm -C autobyteus-web test:e2e:electron` | IR-002 changed the probe's expected keys; not rerun |
| API-07 | GraphQL ops / demo | iOS demo bundle | Existing Test | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run scripts/__tests__/mobileBuildChecks.spec.ts`; `autobyteus-ios/scripts/prepare-demo-web.sh --build`; then `build:mobile-web` | TESTING: GraphQL operations changed |
| API-08 | AC-008, SCN-004, SCN-A1 | packaged start with old data | Temporary Probe | isolated instance `--data-root` with a synthesized old install; first start, check gone + log; second start: no new log line; then catalog in `.env`, restart, Voice Input Not installed | Packaged lifecycle; a durable packaged-instance harness for this one-time step does not fit the repository (the runner spec is the durable check) |
| API-09 | AC-008 failure | packaged start, deletion fails | Temporary Probe | second data root with a non-writable subfolder; start → warning, app and node up; restore permission; restart → deleted | same |
| API-10 | AC-002 (packaged, AR-003), AC-005, AC-007, REQ-012 | packaged window, real attacher, `file://` origin | Temporary Probe | packaged Settings → Extensions → Install; page loads in the frame, language saved, nothing refused; Test transcribes (injected microphone); View log | Real attacher only exists in the packaged shell |
| API-11 | AC-003 (packaged) | packaged window | Temporary Probe | catalog switched to 1.0.1 → Update → On + language kept; then to broken 1.0.2 → failure text, Update offered, Test still dictates | Same journey through the real shell |
| API-12 | AC-010, AC-004, AC-006 (spot), AC-011 (Linux), SCN-A3 | Docker linux-arm64 node in a packaged node window | Temporary Probe | Docker node with the container catalog; desktop adds and connects it, opens its window; Settings → Extensions: no Voice Input, voice note, test extensions (every-node; one not built for linux-arm64; one whose `status()` fails); Install/page call/Remove act on the container; no-credential request refused | Needs a container; not a repository suite |
| API-13 | AC-009, SCN-005, SCN-A4 | Docker node window dictating | Temporary Probe | in the Docker node's window, a voice surface: button shown, dictation inserts text, the WAV POST goes to the embedded node; Off in the main window → focus the node window → no button; On again → button back | Two real nodes and the packaged shell |
| API-14 | QR-002 | warm transcription | Temporary Probe | same 5 s clip, 10 warm runs each: (a) base path: base commit's `voiceInputRuntimeService` (Electron main code, bundled) with runtime 0.3.0, (b) this branch: POST to the node's action route with runtime 0.3.2, (c) runtime 0.3.2 worker direct (attribution) | Measurement, not a regression test |
| API-15 | build inputs (rule 12) | release runners | Journey | `scripts/check_secrets.sh origin/personal..HEAD`; push the ticket branch; `pnpm release:test --ref codex/autobyteus-516-extensions` | DESIGN rule 12: a test added to a typecheck project |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

None as new files.

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-04 | `autobyteus-web/tests/e2e/extensions-page-probe.mjs` | U1/U2 cases before R8: the probe's catalog lists 1.0.1 then a broken 1.0.2 (packed from the extensions repository with the version changed; 1.0.2 pins a runtime release that does not exist); assertions on the card, the node's `getSettings`, the Test result and the worker process count | The catalog server serves a mutable catalog; header updated |
| API-02 | `autobyteus-web/tests/e2e/composer-voice-lifetime-probe.mjs`, `tests/e2e/fixtures/composer-voice-lifetime.page.vue` | Found during execution (Needs Update, stale because of this ticket): answer `GetExtensions` at the network; the window-start read (plugin 22) is in flight before the fixture's `fetch` stub and Apollo de-duplicates later reads onto it | Test-only; header wording corrected |
| API-03 | `autobyteus-web/tests/e2e/projects-voice-cases.mjs`, `tests/e2e/projects-feature-probe.mjs` | Found during execution: the same network answer (this ticket); baseline fixes (base causes, TESTING Rule 9): PT-E2E-005 localized attach text, microphone grant after PT-E2E-017's clipboard-only grant, B-003 Task title | Baseline fixes in their own commit |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron 42, packaged worktree build (`autobyteus-web/electron-dist`).
- Testing guideline, README, or development instructions used: TESTING.md, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: page, card, voice surfaces (probe API-04).
- Shell-specific or lifecycle behavior: deletion step at start; credential attacher for the embedded and a remote node origin, frame subresources; `file://` origin; node windows; focus re-read across windows.
- Chosen validation approach and why it fits the project: isolated instance from the worktree build, driven over CDP with `playwright-core` `connectOverCDP`; the development catalog through the instance data root's own `.env`.
- Server/frontend setup when browser validation is used: probe-owned (API-04).
- How the run avoids disturbing an already-running desktop application: own `--data-root`, own ports and process group; other instances on the machine (`iso-62641-58dd`, not mine) are left alone; never `~/.autobyteus`.

## Live Environment And Fixture Plan

- Startup order and commands: dev catalog server → Docker node (own container) → isolated instance (`--from-worktree --data-root`) → CDP driver.
- Environment choices that materially affect the run: platform darwin-arm64 host, linux-arm64 container; runtime 0.3.2 from GitHub, model from Hugging Face; Node 22.23.1 for scripts; the desktop's embedded node on Electron's Node.
- Health / readiness checks: `/rest/health`, `isolated-app start` JSON, card states.
- Seed data / fixtures: synthesized old install; test extensions packed from ticket-owned folders.
- Test identities: launch owner credential (desktop's own), Docker node owner credential through a setup code.
- Evidence to capture: CDP DOM text and screenshots, network requests (`Network` domain) for the transcribe POST host, instance and container logs, extension logs, directory listings, process lists.
- Owned processes and temporary state to clean up: isolated instances, container + volumes, catalog server, temp roots, the probe's own stack.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Signed/notarized builds, Windows and Linux desktop packages | need the release runners | covered by API-15 (build only) | No | — |
| A real OS microphone in the packaged app | the packaged window's `getUserMedia` is emulated by injection (no TCC prompt in automation) | the recorder's device path is proven in the probe with Chrome's fake device; the OS permission prompt is unchanged by this ticket | No | — |
| Voice runtime on Linux/Windows/Intel | voice is offered only on the desktop node; no such desktop here | runtime team's DEC-006 | No | — |
| The published catalog with the AutoByteus key | release blocker (empty key) | every node `unverified` until the key exists | No | with the Solution Designer |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (update of `extensions-page-probe.mjs`)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: heavy runs are serialized (TESTING "one heavy run at a time"); the machine load was ~18–45 at the start of this round from other agents.
