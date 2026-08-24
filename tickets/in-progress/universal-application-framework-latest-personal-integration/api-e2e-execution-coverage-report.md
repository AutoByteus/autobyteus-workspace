# API/E2E Execution Coverage Report

## Execution Round Meta

- Current API/E2E revision: `API-REV-009`; execution round 9.
- Trigger: `/code_reviewer` `CRR-016` Pass / 95 for `IR-009` controlled-workspace integration.
- Executed reviewer HEAD: `f389358e70054a9e249dd0f06623c1c154c130a5`.
- Reviewed implementation artifact: `8a7955e9455eadc1be689aa4802384381f2107d8`.
- Semantic merge: `53dd98b53490947ed96d4dda9fb45d9c80719740`.
- Governing package: `SR-008`, `ARCH-REV-008`, `IR-009`, `CRR-016`, `DR-008` and the canonical requirements/design/investigation artifacts in this ticket directory.
- Prior authoritative result: `API-REV-008` Pass / 98% for its earlier exact reviewed tree.

## Executive Result

**Pass / 98% validation confidence.** IR-009's controlled New-workspace behavior and the retained current dual-host system pass repository, API, real-process, installed-Chrome and live-provider execution.

- Agent New selection survived runtime/model changes, registered once, launched once and correlated to real Codex Luna response/history.
- Team New selection survived global and member runtime/model changes, registered once and launched one real mixed Classroom team: Professor Codex `gpt-5.6-luna`, Student AutoByteus `deepseek-v4-flash`, exact workspace roots, artifacts and two recipient-name messages.
- Registration failure retained New mode/path/error and performed zero launch with no stale fallback.
- Socratic passed real standalone and Studio business turns. Brief Studio passed real Researcher publication, `/writer` handoff, Writer publication and projected final state.
- Both maintained `dev` and `dev:studio` loops, explicit Studio remount, standalone/Studio restart recovery, route separation and exact `73/73` byte parity passed.
- Cleanup was leak-free and retained evidence contains zero compared secret-like values.

The unchanged adjacent web mock failures retain the independently reviewed `APIE2E-REPO-005` signature and remain **Unclear / separate**. They are neither IR-009 failure evidence nor Pass evidence. Electron packaging remains delivery-owned.

## Investigation And Coverage Decisions

- Coverage investigation completed before final execution: **Yes**; see the `API-REV-009` section in `api-e2e-coverage-investigation.md`.
- Affected existing durable coverage decision: **Still Valid**.
- Durable coverage added/updated/removed by API-REV-009: **None**.
- Production source changed by API/E2E: **None**.
- Broader validation: **Required; executed; Pass** because repository mocks cannot prove real browser state, bound-node registration, process/provider behavior, history, watcher restart or byte integrity.
- Persisted-data outcome: **Directly Usable — No Migration**. Current registry/history/application records were read normally after restart; no compatibility path was used.

## Scenario Matrix

| Scenario | Boundary | Result | Evidence |
| --- | --- | --- | --- |
| `APIE2E-TOPOLOGY-009` | reviewed ancestry, merge/index, retired seams | Pass | `api-rev-009-topology.log` |
| `APIE2E-WORKSPACE-AGENT-009` | controlled New -> one register -> one Agent launch -> history | Pass | `api-rev-009-workspace-agent-real.json/.png`; projection JSON |
| `APIE2E-WORKSPACE-TEAM-009` | controlled New across global/member edits -> one mixed Team launch | Pass | `api-rev-009-workspace-team-real.json/.png` |
| `APIE2E-WORKSPACE-FAILURE-009` | retained New/path/error; zero launch; no fallback | Pass | `api-rev-009-workspace-failure.json/.png` |
| `APIE2E-STUDIO-BRIEF-009` | real publication, named handoff, projection | Pass | `api-rev-009-brief-studio-real.json/.png`; backend log |
| `APIE2E-STUDIO-SOCRATIC-009` | real maintained first-turn identity/projection | Pass | `api-rev-009-socratic-studio-real.json/.png` |
| `APIE2E-STANDALONE-009` | both hosts render; real Socratic; Brief durable restart | Pass | standalone JSON/PNG and process logs |
| `APIE2E-REMOUNT-009` | visible explicit iframe remount and retained state | Pass | `api-rev-009-studio-remount.json` |
| `APIE2E-RECOVERY-009` | same-data Studio and watcher restart recovery | Pass | restart logs and recovery JSON |
| `APIE2E-ROUTES-009` | internal Agent Tools versus Studio-only gateway | Pass | `api-rev-009-route-separation.log` |
| `APIE2E-PARITY-009` | repeated dev loops and immutable package/authoring truth | Pass | four dev logs; pre/post hashes; parity log |
| `APIE2E-CLEANUP-009` | process/port/root/output/secret isolation | Pass | cleanup and secret-scan logs |
| `APIE2E-REPO-005` | inherited broad repository debt | Unclear / separate | adjacent log plus CRR-016 full-web characterization |

## Repository Coverage Execution

| Order | Command / selection | Result |
| --- | --- | --- |
| 1 | exact HEAD/merge ancestry, index, marker and retired-seam audit | Pass |
| 2 | `nuxi prepare`, then seven controlled-workspace/provider Vitest files | `7 files / 100 tests` Pass |
| 3 | adjacent workspace stores, launch policy and history | `7 files / 102 tests` Pass; `2` unchanged `runHistoryStore` mock failures separately Unclear |
| 4 | application SDK contract builds, Nuxt production build | Pass |
| 5 | server production build; both maintained app build/validate | Pass after canonical frontend-SDK prerequisite |
| 6 | architecture, event-journal recovery, lifecycle, imported Brief and standalone server | `5 files / 29 tests` Pass |

The first focused web attempt lacked generated `.nuxt/tsconfig.json`; `nuxi prepare` created the documented generated prerequisite and the authoritative rerun passed `100/100`. The first app pack attempt lacked the clean-source frontend SDK output; building that prerequisite made both authoritative app build/validate runs pass. These are environment preparation corrections, not product failures.

## Changed-Boundary Results

### Controlled Agent Workspace

- Exact New path: `/private/tmp/api-rev009-agent-workspace-final`.
- Path remained unchanged after runtime and model selection.
- Exact model: `OpenAI / GPT-5.6-Luna` through `codex_app_server`.
- Operation delta: one `CreateWorkspace`, one `PrepareAgentRun`, zero duplicate `CreateAgentRun`.
- Real run: `codex_e3e3424599df4dbeb3dbd00b2611cc51`.
- Observable result: exact assistant response `API-REV-009-AGENT-READY`; exact run present in workspace history; zero console errors.

### Controlled Team Workspace

- Exact New path: `/private/tmp/api-rev009-team-workspace-final`.
- Path remained unchanged after global runtime/model and Student runtime/model edits.
- One `CreateWorkspace` and one `CreateAgentTeamRun`.
- Team run: `classroom_simulation_team_f63ce7b6004447198d1aa056e619a968`.
- Professor: Codex / `gpt-5.6-luna`; Student: AutoByteus / `deepseek-v4-flash`; both bound to the exact workspace.
- Professor created the assignment and delivered it to `/student`; Student read it, wrote `student-answer.md`, and replied to `/professor`. Two exact communication records, run tree and history correlated; zero console errors.

### Registration Failure / No Fallback

- Real Studio browser plus controlled GraphQL failure at the external registration boundary.
- Exact New path remained visible; error rendered; New mode remained selected.
- Operation delta: one registration, zero Agent launch, zero Team launch.
- No Existing/Temp fallback or history mutation occurred.
- Temporary interception is appropriate for the environment-dependent negative; durable deterministic component coverage owns the reusable behavior.

## Real Dual-Host Execution

- **Socratic Studio:** real authenticated Codex Luna returned `7 + 5 = 12`; exact lesson, binding, tutor run, two-message transcript and notification were projected.
- **Socratic standalone:** real authenticated Codex Luna returned `3 + 4 = 7`; exact lesson/binding/team/tutor identifiers were visible.
- **Brief Studio:** package-owned Researcher and Writer completed in about 100 seconds; real `/writer` handoff and two publications produced two draft outputs, one final output and `in_review`.
- **Brief standalone:** rendered over HTTP 200, created a durable record, restarted through the supported watch loop and recovered the exact record.
- **Studio explicit remount:** the visible immersive-menu `Reload application` action changed iframe `performance.timeOrigin`, proving document recreation, while the Brief record remained readable.
- **Studio same-data restart:** after graceful shutdown and restart against the exact isolated SQLite root, both package identities re-entered and retained their Brief/Socratic records and generated outputs with zero browser console errors.

The console-only 404 observed on initial standalone page loads was `/favicon.ico` (confirmed in host logs); immediate response-level follow-up observed no HTTP error and the application routes remained ready.

## Route, Watcher And Package Integrity

- Studio internal `/mcp/agent-tools/fake-session`: `401 unauthorized`.
- Studio external `/mcp/gateway` initialize: `200`, MCP protocol `2025-03-26`.
- Standalone internal fake session: `401 unauthorized`.
- Standalone external `/mcp/gateway`: `404 not found`.
- Two edit/restore rounds produced four source-change cycles per app in both `dev` and `dev:studio`; every standalone host returned ready and every Studio worker completed package reload.
- The canonical 73-path SHA-256 inventory was identical before and after all maintained loops: `73/73`, `changed_count=0`.

## Environment And Data Fidelity

- macOS ARM64; Node `v22.23.1`; pnpm `10.28.2`.
- Installed Google Chrome; installed Codex executable authenticated through ChatGPT.
- Studio: isolated loopback `8049`/`3049` and marked `/private/tmp/api-rev009-studio-20260824` SQLite/data root.
- Standalone: isolated per-application `.autobyteus/dev/data` roots and ports `43301`/`43302`.
- Supported secret import configured nine recognized credentials into the isolated Studio vault; values were never emitted.
- `/Users/normy/autobyteus_org/autobyteus-agents` was already in the isolated source configuration and loaded `7` shared agents, `50` team-local agents and `12` teams. The API correctly rejected a duplicate import instead of adding it twice.
- The accepted Studio run explicitly set the isolated SQLite URL. An earlier initialization-only attempt inherited the copied user `DATABASE_URL`, applied no migration (`No pending migrations`) and was stopped before package/business execution; this harness correction is retained transparently.

## Validation Confidence Scorecard

| Category | Post-repository | Final | Evidence / residual |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 94% | 99% | all controlled success/failure/order and retained critical criteria directly exercised |
| Changed-boundary execution directness | 96% | 99% | real component, GraphQL, filesystem, launch and history boundaries |
| Cross-boundary integration realism and mock gap | 88% | 99% | real Chrome, hosts, Codex, DeepSeek, GraphQL, WebSocket/history and SQLite |
| Environment/configuration/identity fidelity | 92% | 98% | exact reviewed tree, packages, model/runtime identities and isolated roots; providers remain mutable |
| Failure, edge-case, lifecycle and recovery | 91% | 97% | no-fallback failure, remount, watcher and same-data restart |
| User/browser/desktop-equivalent | 82% | 98% | real Studio forms/iframes plus both standalone hosts; Electron downstream |
| Durable regression quality/relevance | 96% | 96% | direct 100-test changed suite; unchanged broad debt remains separate |

- Overall post-repository confidence: **91%**.
- Overall final confidence: **98%** (simple average, rounded).
- Lowest final category: **96%**.
- Critical current criteria missing direct proof: **None**.

## Durable Coverage Changes

- Added: none.
- Updated: none.
- Removed: none.
- Required proportional test-code review: **Yes by workflow; expected `Not Applicable`**.

## Harness Corrections

1. Generated Nuxt and frontend-SDK clean-source prerequisites were built before authoritative reruns.
2. Non-TTY secret import correctly stopped at `IMPORT_CONFIRMATION_REQUIRED`; the supported direct-TTY confirmation then configured nine credentials and the dry-run postcheck showed nine `SKIP_CONFIGURED`.
3. The accepted Studio server used an explicit isolated database after the initialization-only inherited-URL attempt described above.
4. Initial remount probes targeted a hidden responsive-menu button; the authoritative visible immersive-menu action recreated the iframe document and retained state.
5. The first Team artifact check guessed the run-folder slug; the evidence records the corrected actual live folder `addition-basics` and exact files.

## Cleanup

- Owned ports `3049`, `8049`, `43301`, `43302`: free.
- Marked `/private/tmp/api-rev009-*` roots: zero remaining.
- Per-app `.autobyteus` roots and generated SDK/devkit/server/web/app outputs: removed.
- Ordinary AutoByteus listener `29695`: preserved.
- Secret comparison: 12 secret-like values across 38 retained text artifacts; zero matches.
- Source edit bytes: restored; exact 73-path parity remained clean.

## Evidence Index

Evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/`

- Repository/build: `api-rev-009-topology.log`, `focused-web.log`, `adjacent-web.log`, `retained-server.log`, `web-build.log`, `system-build.log`.
- Controlled workspace: Agent real/projection JSON/PNG; Team real JSON/PNG; failure JSON/PNG.
- Maintained applications: Brief/Socratic Studio real JSON/PNG; Socratic standalone real JSON/PNG; both-host and standalone recovery JSON/PNG.
- Lifecycle/routes/parity: Studio remount/restart logs and JSON; route-separation log; four dev logs; pre/post hashes and parity log.
- Environment/cleanup: agent-package import JSON, secret-import/environment/secret-scan/cleanup logs.

## Result And Routing

- Result: **Pass**.
- Final confidence: **98%**.
- Current failure IDs: **None**.
- Historical residual: `APIE2E-REPO-005` remains separate/Unclear.
- Downstream residual: Electron packaging/shell validation remains delivery-owned.
- Required recipient: `/code_reviewer` for proportional successful test-code review, expected `Not Applicable` because no durable test changed.
