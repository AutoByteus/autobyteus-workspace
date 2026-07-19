# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/proposed-design.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/upstream-novnc-evaluation.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/code-review-report.md`
- Current Investigation Round: 3
- Trigger: Round-4 implementation-source review pass for correction commit `ba703f842d79dfab03f4c15add73396acdc247a9`, which resolves `CR-001` by distinguishing generic web and Electron renderer notice outputs.
- Prior Investigation Reviewed: Yes — round 2's `VNC-PKG-DESKTOP-001` failure is the mandatory first recheck; round 1's 97.1% browser/service evidence remains applicable to unchanged runtime surfaces.
- Latest Authoritative Investigation: Round 3 completed with `Pass`; the correction-revalidation addendum records the plan, direct execution, 96.9% confidence outcome, and proportional-review routing.

## Current Requirement And Design Basis

The approved change is a behavior-preserving provider replacement. The frontend must resolve the exact official package-root `@novnc/novnc@1.7.0-g7c36fab`, not stable `1.7.0`, a deep path, a local copy, or a fallback. `useVncSession` remains the application owner of connection identity, configured password and shared-session construction, event-to-state translation, view-only/scaling/fullscreen-resize policy, bounded resize retry/restore, and cleanup. The selected package owns the real WebSocket/RFB, canvas/input, and permission-aware automatic clipboard boundary. Critical runtime proof therefore includes a real password-authenticated RFB/websockify handshake, canvas/display lifecycle, view-only and fullscreen behavior, clean disconnect/reconnect, bidirectional clipboard with actual browser permissions, and denied/unsupported clipboard fallback. Package identity/content, complete legacy removal, tests, type delta, and production bundling also remain required evidence.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / `DS-001`, `DS-005` connection and event boundary | Preserved over changed provider resolution | Requirements `AC-004`, `AC-007`; reviewed design and source report | Mocked event coverage remains useful, but a real RFB/WebSocket/auth handshake and UI lifecycle are required. |
| `BEH-002` / `DS-002`, `DS-006` viewport and lifecycle policy | Preserved | Requirements `AC-006`, `AC-007`; existing composable tests | Retain mock-timer checks and add realistic canvas/maximize/Escape/restore observations against a resize-capable server. |
| `BEH-003` / `DS-003`, `DS-004` clipboard | Preserved only by exact selected package | Requirements `AC-002`, `AC-005`, `AC-008`; upstream evaluation | Add exact package-content regression coverage and real browser-to-X/remote-X-to-browser clipboard checks; also prove denial/unsupported APIs do not break connection. |
| `BEH-004` / `DS-007` package/build path | Changed from checked-in source to package metadata | Requirements `AC-001`, `AC-003`, `AC-009`, `AC-010` | Add durable package-contract coverage; rerun target/full frontend tests, structural checks, type-delta check, and production generation. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Backend code is unchanged; it only supplies VNC settings and a documented Docker VNC service. | Server settings code/docs and unchanged backend tests. | N/A | None |
| API / transport / contract | Yes | Browser WebSocket/RFB provider changes from copied source to the official ESM package. | Package source, mocked session tests, successful bundle. | Real handshake, VNC authentication, RFB traffic, and server events. | Live browser + owned Docker VNC/websockify |
| Frontend component / state | Yes | Components are unchanged but their session provider implementation changes. | Layout rendering and mocked composable state tests. | Actual canvas, status/control transitions, maximize and Escape. | Browser |
| Browser integration / user journey | Yes | Canvas, WebSocket, Clipboard, Permissions, focus, ResizeObserver, and fullscreen-fit behavior. | Mocked DOM/timers and production generation only. | Browser API security and focus semantics, WebSocket interoperability, real framebuffer rendering. | Browser |
| Authentication / session / permissions | Yes | VNC credentials and browser clipboard permissions. | Source review confirms `{ credentials: { password }, shared: true }`; no real auth/permission run. | Correct password negotiation and denied/unsupported clipboard behavior. | Password-authenticated VNC plus granted/denied/unsupported browser contexts |
| Desktop renderer / web-equivalent UI | Yes | The VNC viewer is shared web/Electron renderer behavior. | Nuxt tests/generation. | Real web-equivalent renderer journey. | Browser-preferred validation |
| Desktop shell / Electron-specific integration | No | No preload, IPC, native window, main-process, or packaging logic changed. | Architecture and diff inspection. | None material to this provider boundary. | None; actual desktop run is unnecessary and would disturb a running user app. |
| Process / lifecycle | Yes | RFB connect/disconnect/reconnect, retry timers, WebSocket and owned service lifecycle. | Mock timer checks. | Real service readiness, disconnect, and reconnection. | Browser + owned Docker lifecycle |
| Persisted-data transition | No | Approved `Not Affected`. | Requirements/design/handoff. | None. | None |
| Worker / queue / distributed coordination | No | None. | Diff/design. | None. | None |
| External integration | Yes | Official npm package interoperating with TigerVNC/websockify and browser clipboard. | Package metadata/source and build. | Live cross-boundary behavior. | Owned Docker VNC/websockify and Chrome |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc`
- Project type and runtime stack: pnpm monorepo; Nuxt 3/Vite/Vue/Vitest frontend; Electron wrapper; Playwright Core browser probes; Docker-based AutoByteus server image with TigerVNC, websockify, XFCE, Chromium, `xclip`, and configurable server settings.
- Conflicting, missing, or unclear project instructions: No conflict. Frontend `.env.example` is older than the README's preferred `BACKEND_NODE_BASE_URL`, so the README and `nuxt.config.ts` are authoritative for local proxy setup. There is no existing VNC live probe or supplied fixture; the documented server Docker image is the project-supported realistic dependency.
- Required environment variables or secrets available: Yes. No external secret is needed. The owned test container will use an isolated known VNC password and ephemeral storage. Existing user containers and the running AutoByteus desktop application will not be stopped, changed, or reused.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Closest frontend instructions | Use pnpm and colocated tests; always add `--run`; never stage all files. |
| `autobyteus-web/README.md` | Frontend development/test/browser-probe guide | Use `BACKEND_NODE_BASE_URL`, `pnpm dev`, targeted/full Nuxt tests, production build/generation, and Playwright Core with discovered Chrome. |
| `autobyteus-web/nuxt.config.ts` | Actual development endpoint configuration | Development `/graphql` and `/rest` proxy to `BACKEND_NODE_BASE_URL`; browser WebSocket VNC URLs come from server settings. |
| `autobyteus-web/package.json` | Authoritative scripts | `test:nuxt`, `generate`, and existing `test:e2e:workspace-responsive` conventions. |
| `autobyteus-web/tests/e2e/workspace-responsive-probe.mjs` | Existing durable browser-probe pattern | Accept base URL/output/browser arguments, use Playwright Core/installed Chrome, retain JSON/screenshots, and avoid pretending an absent VNC service is covered. |
| `autobyteus-server-ts/AGENTS.md` | Server test instructions | `vitest run`/`--no-watch`; backend source is not changed. |
| `autobyteus-server-ts/docker/README.md` and `docker/docker-compose.yml` | Project-supported VNC environment | Published image exposes backend 8000, VNC 5900, websockify 6080, and debug 9223; use isolated volumes/ports and remove only owned resources. |
| Selected image `/etc/supervisor/conf.d/base.conf` and `/usr/local/bin/start-vnc.sh` | Runtime discovery | Image has TigerVNC, websockify, XFCE, Chromium and clipboard tooling. Default server is no-auth; the validation fixture will add a second isolated `VncAuth` display/websockify endpoint so configured password behavior is real. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Owned AutoByteus server/VNC container | Worktree root | `docker run` with a unique label/name, random host ports, ephemeral storage, and the cached documented `autobyteus/autobyteus-server:latest` image | Do not touch existing launcher-managed containers. Add a second TigerVNC display with `VncAuth` and websockify inside this owned container; return its host endpoint/password through server settings. | Backend `/rest/health`; websockify HTTP header; `supervisorctl status`; authenticated display dimensions via `xdpyinfo`. | `docker rm -f <owned-name>` and remove any explicitly created owned volumes/files. |
| Frontend dev server | `autobyteus-web` | `BACKEND_NODE_BASE_URL=http://127.0.0.1:<owned-backend-port> pnpm dev --port <owned-frontend-port>` | Unique port; browser path is the preferred web-equivalent Electron-renderer validation. | HTTP 200 plus `/graphql` proxy success. | Terminate only the captured child process/session. |
| Chrome / Playwright Core | `autobyteus-web` | Durable VNC live probe with explicit base URL, owned container name, output directory, and Chrome executable discovery | Granted clipboard context plus separate denied/unsupported contexts; screenshots support semantic assertions. | Browser launch and `/workspace` load. | Close browser contexts/browser; clear no persistent profile. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Server setting for one VNC WebSocket endpoint | Container environment `AUTOBYTEUS_VNC_SERVER_HOSTS=127.0.0.1:<mapped-auth-websockify-port>` | Isolated backend config only. | Removed with owned container. |
| VNC password | Ephemeral TigerVNC password file plus `updateServerSetting` GraphQL mutation for `AUTOBYTEUS_VNC_SERVER_PASSWORD` after backend readiness | Non-secret isolated test value; API seeding makes the configured application password path observable to the frontend. | Backend/config and password file removed with owned container. |
| Remote clipboard values | `docker exec` as `vncuser` with `DISPLAY=:100` and `xclip` | Unique sentinel text; affects only owned display. | Overwritten/removed with container. |
| Browser permission states | Fresh Playwright incognito contexts | No user browser profile or current desktop app state reused. | Context close. |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `proposed-design.md` “Persisted Data / State Transition Decision”; `implementation-handoff.md` “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: N/A; no stored subject, reader, writer, schema, or migration changed.
- Evidence planned: Structural/source diff confirmation that only dependency/provider/type/test seams changed; no runtime migration or compatibility branch.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/__tests__/useVncSession.spec.ts` initial remote resize | Connect event temporarily sets interactive/remote-resize, retries, then restores view-only. | `AC-006`; `DS-006` | Still Valid | Approved timing/policy is unchanged. | Retain and rerun. |
| Same file fullscreen-fit restore | Fullscreen-fit stays interactive/resize-enabled after initial handshake. | `AC-006`, `AC-007`; `DS-002`, `DS-006` | Still Valid | Approved policy unchanged. | Retain and rerun. |
| Same file module mock/constructor/event coverage | Mock uses the correct package root but does not directly assert credentials/shared options or most lifecycle events. | `AC-004`, `AC-007`, `AC-009` | Needs Update | Existing scenarios remain valid; missing requirement-linked assertions are material. | Add focused constructor, credentials-required, disconnect/security/lifecycle scenarios without rewriting implementation. |
| `autobyteus-web/components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts` | Layout suite can import/render the workspace with the package-root mock. | `AC-009`; `BEH-004` | Still Valid | Mock seam matches production root identity. | Retain and rerun. |
| `autobyteus-web/utils/__tests__/vncHosts.spec.ts` | Normalizes configured VNC endpoints. | `AC-004`; `DS-001` | Still Valid | Host parsing behavior is preserved. | Retain and rerun. |
| `autobyteus-web/tests/e2e/workspace-responsive-probe.mjs` | Proves VNC tab reachability/focus but deliberately does not select it because its deterministic fixture has no VNC service. | Workspace user-surface reachability, not `AC-004`/`AC-005`. | Still Valid | Its explicit limitation remains accurate. | Do not weaken or repurpose; add a separate service-backed probe. |
| Existing full Nuxt suite and `pnpm generate` | Detect broad frontend regressions and production bundling failure. | `AC-009`, `AC-010` | Still Valid | Project-authoritative commands. | Execute after coverage changes. |

## Stale Or Obsolete Coverage Decisions

None. No existing test asserts the removed local source path or an approved legacy fallback.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `VNC-PKG-001` | Exact official version/root export/registry integrity/clipboard implementation and absent vendored tree | `AC-001`–`AC-003`, `AC-008`; `DS-003`, `DS-004`, `DS-007` | `autobyteus-web/tests/integration/novnc-package-contract.integration.test.ts` | Prevent stable `1.7.0`, deep-path, missing clipboard, or re-vendoring regressions from silently passing mocked tests. |
| `VNC-LIVE-001` | Password-authenticated connection, visible canvas/status, configured host, clean disconnect and reconnect | `AC-004`, `AC-007`; `DS-001`, `DS-005` | `autobyteus-web/tests/e2e/vnc-live-probe.mjs` | Directly exercises the changed package over WebSocket/RFB and the real application UI. |
| `VNC-LIVE-002` | Default view-only, interactive toggle, maximize remote resize, Escape/restore | `AC-006`, `AC-007`; `DS-002`, `DS-006` | Same durable live probe | Closes the browser/ResizeObserver/server mock gap. |
| `VNC-LIVE-003` | Local browser clipboard to remote X clipboard and remote X clipboard to browser | `AC-002`, `AC-005`, `AC-008`; `DS-003`, `DS-004` | Same durable live probe | This is the critical behavior that makes the exact development build necessary. |
| `VNC-LIVE-004` | Denied and unsupported clipboard APIs do not prevent VNC connection/interaction | `AC-005`; `BEH-003` | Same durable live probe | Protects safe fallback under real browser state/emulation. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `VNC-UNIT-001` | `autobyteus-web/composables/__tests__/useVncSession.spec.ts` | Add direct constructor option assertion for URL, password credentials, and `shared: true`, plus current-session lifecycle/credentials/security/cleanup assertions. | `AC-004`, `AC-007`; `DS-001`, `DS-005` | Existing two policy tests remain intact. |
| `VNC-SCRIPT-001` | `autobyteus-web/package.json` | Add a named manual live-probe script following the existing browser-probe convention. | `AC-004`–`AC-007`, `AC-009` | No automatic environment startup is hidden in the script. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm install --offline --frozen-lockfile` | Worktree root; pnpm workspace | Frozen package resolution and exact lock usability | Pass | `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/frozen-offline-install.log` |
| 2 | Exact manifest/lock/package/source/forbidden-reference checks plus `node --check` and `git diff --check` | Worktree root | `VNC-PKG-001`, `AC-001`–`AC-003`, `AC-008`; live-probe syntax and patch integrity | Pass | `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/final-structural-checks.log` |
| 3 | `pnpm test:nuxt tests/integration/novnc-package-contract.integration.test.ts composables/__tests__/useVncSession.spec.ts components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts utils/__tests__/vncHosts.spec.ts --run` | `autobyteus-web` | Package contract and focused session/layout/host behavior | Pass — 4 files, 35 tests | `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/final-targeted-vitest.log` |
| 4 | `pnpm test:nuxt --run` | `autobyteus-web` | Broader frontend regression coverage | Fail — 365 files/1,986 tests passed; four unrelated existing assertions failed in untouched history, memory, settings-copy, and zh-CN glossary areas | `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/full-nuxt-vitest.log` |
| 5 | `pnpm generate` | `autobyteus-web` | Production package bundling/static generation | Pass — 3,552 client modules and 15 prerendered routes | `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/nuxt-generate.log` |
| 6 | `pnpm exec nuxi typecheck` with error-count/noVNC-delta comparison | `autobyteus-web` | Narrow declaration/type integration | Expected approved baseline failure — exactly 242 errors and zero `@novnc/novnc` or `types/novnc.d.ts` lines | `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/nuxi-typecheck.log`; `nuxi-typecheck-summary.txt` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 84% | Exact identity/integrity/source markers, removed-tree scans, focused policy/event tests, frozen install, and production generation directly cover structural/build criteria. | Critical authenticated RFB, real clipboard, and browser resize outcomes remain unexecuted. | Run `VNC-LIVE-001` through `VNC-LIVE-004`. |
| Changed-boundary execution directness | 82% | The official package root resolves, its real source is inspected, and Nuxt bundles it; application policy tests exercise the root mock contract. | Mocked RFB tests bypass the actual WebSocket/RFB/canvas provider. | Exercise the installed module in Chrome against real websockify/TigerVNC. |
| Cross-boundary integration realism and mock gap | 75% | Package resolution and bundling are real, while session behavior has useful component/composable coverage. | Frontend, Clipboard/Permissions, WebSocket, websockify, and VNC server have not yet been crossed together. | Owned live container plus browser journey. |
| Environment, configuration, identity, and fixture fidelity | 75% | Frozen workspace and production generation use the assigned worktree and exact dependency; environment prerequisites were discovered. | No configured VNC identity/password, remote display, or browser permission state has yet been exercised. | Seed the isolated settings/password fixture and three browser permission contexts. |
| Failure, edge-case, lifecycle, and recovery evidence | 82% | Timer restoration, current/stale session events, credentials-required, security failure, disconnect, and cleanup are covered deterministically. | Real disconnect/reconnect and permission-denied/unsupported behavior remain indirect. | Execute live reconnect and non-fatal clipboard fallback scenarios. |
| User-surface, browser, and desktop-shell confidence | 75% | Workspace layout renders in tests and the production renderer generates successfully; no shell code changed. | No real VNC canvas, control transition, focus, or maximize/Escape journey has run. | Chrome browser validation; Electron execution is unnecessary because no shell boundary changed. |
| Durable regression coverage quality and relevance | 95% | Exact package-content contract, focused lifecycle/constructor assertions, and a reusable service-backed browser probe are narrow and requirement-linked. | The new live probe still requires its realistic external fixture to be executed. | Run the probe and retain structured evidence. |

- Overall post-repository confidence: **81.1%**
- Calculation method: Simple average of all seven applicable categories: `(84 + 82 + 75 + 75 + 82 + 75 + 95) / 7`.
- Every critical acceptance criterion directly proven: `No` — `AC-004`, `AC-005`, and the real browser/server portion of `AC-006` remain outstanding.
- Any applicable category below `90%`: `Yes` — all except durable regression coverage quality.
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks: Authentication/provider interoperability, real canvas and resize behavior, focus-triggered bidirectional clipboard, permission fallback, and reconnect remain mocked or unexecuted. The four broader-suite failures are outside the changed surface and are reported rather than concealed; they do not substitute for live evidence.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Browser` plus `Lifecycle` against an owned Docker VNC/websockify fixture.
- Specific confidence gap or residual risk addressed: Real package-root bundling at runtime, authenticated RFB/WebSocket interoperability, canvas/display and event lifecycle, remote resize, browser permission/focus semantics, and bidirectional clipboard are not proven by mocks or source inspection.
- Why the selected mode can materially improve confidence: It crosses the exact changed provider boundary from application UI through the generated browser module, WebSocket, websockify, authenticated TigerVNC, remote X display, and browser clipboard.
- Expected confidence after selected validation: At least 95% overall with no applicable category below 90%, if every critical scenario passes and cleanup is complete.
- Browser-specific decision and rationale: Browser is the documented development surface and directly exercises the web-equivalent Electron renderer behavior. No Electron preload/main-process boundary changed.
- If Blocked: N/A at investigation time; Docker Desktop, cached project image, Playwright Core, and Chrome are available. Failure to start the owned fixture will be recorded precisely rather than bypassed with an existing user container.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wraps the Nuxt renderer.
- Relevant README or development instructions: `autobyteus-web/README.md` Web Development, Desktop, and Testing sections.
- Web-equivalent behavior: Entire changed VNC UI/session/package/clipboard boundary.
- Shell-specific or lifecycle behavior: None changed; no preload, IPC, native permission bridge, window management, or desktop main-process code is involved.
- Chosen validation approach and why it fits the project: Isolated Chrome browser against the documented Nuxt development path and owned server/VNC fixture.
- Server/frontend setup when browser validation is used: Unique ports and explicit backend proxy base; no user service reuse.
- Effect on any already-running desktop application: None. The running `/Applications/AutoByteus.app` process and its server remain untouched.
- Behavior not directly proven and confidence consequence: Electron packaging itself is not rerun because production Nuxt generation already covers the changed renderer bundling and no shell boundary changed; negligible residual uncertainty only.

## Live Environment And Fixture Plan

- Startup order and commands: Allocate free ports; start one labelled owned server container; seed the isolated VNC password through the server's GraphQL setting mutation; create password-authenticated display `:100` and websockify endpoint inside it; confirm backend/VNC readiness; start Nuxt dev with the owned backend base; run the durable probe.
- Environment choices that materially affect the run: Exact current worktree; cached published server image; fresh ephemeral backend storage; TigerVNC `VncAuth`, `AlwaysShared`, `AcceptCutText`, `SendCutText`; Chrome incognito contexts; `127.0.0.1` secure-context origin.
- Health / readiness checks: Docker state/supervisor logs, `/rest/health`, websockify HTTP header, `xdpyinfo`, frontend HTTP and proxied GraphQL.
- Seed data / fixtures: One VNC host setting and known test password; unique clipboard sentinels.
- Test identities, authentication, permissions, or session state: VNC password only; no application account. Clipboard granted in the primary context, denied with CDP in another, and unsupported through a fresh context init override.
- Requirement-linked journeys or scenarios: `VNC-LIVE-001` through `VNC-LIVE-004`.
- Evidence to capture: Structured JSON, screenshots, browser console/WebSocket failures, backend/websockify/Xvnc logs, remote display dimensions, remote and browser clipboard observations.
- Owned processes and temporary state to clean up: Frontend child process, browser/contexts, owned Docker container, temp files and any owned volumes.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `VNC-FIXTURE-001` | One-off shell orchestration to allocate ports and add a password-authenticated secondary TigerVNC display inside the owned documented server image | Deterministic realistic fixture startup/readiness/cleanup | Environment orchestration is ticket evidence; the reusable browser assertions remain durable, while hard-coding a heavyweight container lifecycle into normal frontend tests would be intrusive. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Electron main-process/native shell execution | No shell boundary changed; browser directly covers the renderer behavior and actual desktop execution could disrupt the user's running app. | Negligible. | None unless browser evidence reveals a shell-only problem. |
| Multi-node/distributed VNC | Not part of the approved change. | None for scope. | None. |
| Persisted-data migration | Approved `Not Affected`. | None. | None. |

## Ambiguities Or Reroute Triggers

None at investigation time. A failing current requirement will be preserved with scenario ID and sent to `code_reviewer` for focused origin analysis; no test assertion is currently unclear.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — add package contract and live browser probe, update the focused session test and package script; remove none.
- Post-repository confidence: 81.1%; critical browser/server evidence remains outstanding.
- Broader validation decision: Required.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing user containers prove Docker availability but will not be used as fixtures because ownership is not assigned. All realistic validation will use resources created and labelled by this run.

---

## Round 2 Revalidation Addendum — MPL-2.0 Notice Packaging

### Round 2 Upstream And Changed-Boundary Basis

- New upstream artifacts reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/delivery-reroute-report.md`; round-2 `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/code-review-report.md`; appended delivery-fix section in `implementation-handoff.md`; prior `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/api-e2e-test-review-report.md`.
- Reviewed local-fix commit: `7fe03f83e869d5badbf10a35d2898a185c190116` over runtime implementation `4ae4733637bc3d471051783b29894dad0d0e3c28`.
- Actual new boundary: one canonical exact-version third-party notice; shared source/web/desktop path mapping; Nuxt public copy; Electron `extraResources` input; packaging preflight; one additional package-contract case.
- Explicitly unchanged boundaries: Manifest, lockfile, installed noVNC revision, `useVncSession`, VNC UI, WebSocket/RFB session, clipboard, browser permissions, ambient declaration, backend, and persisted data.
- Runtime evidence preservation decision: Prior round-1 `VNC-LIVE-001`–`VNC-LIVE-004` evidence remains valid because the reviewed commit contains no runtime/provider/session/browser change. Repeating the VNC browser journey would not exercise the new Electron packaging boundary and therefore would not materially improve confidence.

### Round 2 Surface Classification

| Surface / Boundary | Affected? | Round 2 Change | Existing Evidence | Remaining Direct Gap | Selected Validation |
| --- | --- | --- | --- | --- | --- |
| Browser VNC runtime / user journey | No | None | Prior real Chrome/TigerVNC/websockify pass at 97.1%; runtime diff absent | None introduced by commit `7fe03f83e` | Preserve exact prior execution context; no live rerun |
| Package identity / clipboard provider | No | Exact version remains the notice identity | Prior contract/source/live evidence | Notice/package drift must fail together | Rerun extended contract |
| Nuxt web distribution | Yes | Canonical notice must appear byte-identically in `dist/public/THIRD_PARTY_NOTICES` | Project generation path | Actual current output and content identity | Rerun generation; compare size/hash/bytes |
| Electron desktop packaging input | Yes | Same notice must be supplied as explicit `extraResources` in every existing build branch | Reviewed mapping and compiled-source inspection | Executed compiled orchestration/preflight/config handoff | Transpile build scripts; execute positive and negative packaging harness with captured builder config |
| Durable regression coverage | Yes | Package contract gained fourth notice/packaging case | Prior proportional review covered only the first three cases | New test-code structure and execution | Run focused 36-test set; return changed durable test for proportional review |
| API/backend/auth/session | No | None | Prior real settings/VNC auth and lifecycle evidence | None | No rerun |
| Persisted-data transition | No | Still `Not Affected` | Requirements/design/handoff | None | N/A |

### Round 2 Coverage Validity Decisions

| Path / Scenario | Decision | Reason / Evidence | Action |
| --- | --- | --- | --- |
| `tests/integration/novnc-package-contract.integration.test.ts` / original three cases | Still Valid | Exact provider/root/clipboard/removal requirements are unchanged. | Rerun. |
| Same file / new notice-packaging case | Needs Update already implemented by local-fix owner | New distribution boundary must bind exact dependency metadata/content to canonical notice and shared web/desktop mapping. | Validate current case; send for new proportional test-code review. |
| `composables/__tests__/useVncSession.spec.ts`, layout, host parsing | Still Valid | Runtime/session surfaces are unchanged but focused set detects accidental cross-surface regression. | Rerun focused set. |
| `tests/e2e/vnc-live-probe.mjs` and canonical round-1 result | Still Valid | No runtime/browser/provider code changed; final prior run crossed the real boundary with zero failures. | Preserve, do not rerun. |
| Prior full Nuxt and typecheck baselines | Still Valid | Local fix does not touch failing history/memory/settings/localization or TS declaration/runtime paths. | Do not spend disproportionate time rerunning unchanged known baselines; preserve prior exact evidence. |
| `pnpm generate` | Needs Revalidation | It is the real changed web notice-copy boundary. | Rerun and inspect output. |
| Electron packaging path | Add Temporary Executable Probe | A signed installer is disproportionate and requires prepared server/signing resources, but compiled configuration and preflight can be executed safely with the real notice/output and an intercepted builder handoff. | Retain round-2 packaging harness and capture. |

### Round 2 Planned Repository And Packaging Execution

| Order | Command / Method | Boundary Proven | Initial Status | Evidence Path |
| --- | --- | --- | --- | --- |
| 1 | `pnpm install --offline --frozen-lockfile` | Exact lock remains installable after packaging fix | Pass | `probes/api-e2e/revalidation/frozen-offline-install.log` |
| 2 | Focused noVNC Vitest set with `--run` | Original provider/session coverage plus new notice contract | Pass — 4 files / 36 tests | `probes/api-e2e/revalidation/focused-novnc-vitest.log` |
| 3 | `pnpm generate` | Real Nuxt web public notice copy and unchanged web renderer build | Pass — 3,552 modules; exact notice generated under `dist/public` | `probes/api-e2e/revalidation/nuxt-generate.log` |
| 3b | `pnpm generate:electron` | Real documented Electron renderer generation immediately before packaging | Pass generation, but exposed packaging-path mismatch — output contains the notice only under `dist/renderer`, and generation removes `dist/public` | `probes/api-e2e/revalidation/nuxt-generate-electron.log`; `packaging-normal-electron-flow.log` |
| 4 | Canonical/generated/installed-package provenance, byte, hash, and forbidden-reference checks | Exact notice identity and clean provider boundary | Pass for web generation — canonical and `dist/public` were 26,305 byte-identical bytes with SHA-256 `399fad4d…97b3`; runtime diff absent | `probes/api-e2e/revalidation/notice-and-structure.log` |
| 5 | `pnpm transpile-build` and compiled mapping inspection | Type-correct Electron packaging authority | Pass compilation; mapping currently names the incompatible `dist/public` preflight path | `probes/api-e2e/revalidation/transpile-build.log`; `compiled-mapping.json` |
| 6 | Execute compiled `build.js --mac` through a temporary intercepted electron-builder harness, once after web generation, once with intentional missing output, and once after the real `generate:electron` sequence | Actual positive/config handoff, negative fail-fast, and documented desktop build sequencing without signing or touching user applications | **Fail — `VNC-PKG-DESKTOP-001`**: after `generate:electron`, real notice is `dist/renderer/...` while preflight requires missing `dist/public/...`; build exits 1 before electron-builder | `probes/api-e2e/revalidation/packaging-normal-electron-flow.log`; `packaging-normal-electron-flow-summary.txt`; supporting positive/negative captures |
| 7 | `git diff --check` and ownership cleanup scan | Patch integrity and no retained temporary process/container/data | Pass | `probes/api-e2e/revalidation/final-integrity.log` |

### Round 2 Pre-Execution Confidence And Broader Decision

| Confidence Category | Round 1 Final | Round 2 Pre-Execution | Reason For Current Score |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | 90% | Runtime criteria remain proven, but the newly required distribution notice is source-reviewed rather than independently executed. |
| Changed-boundary execution directness | 98% | 78% | The new web/desktop packaging boundary has not yet been executed by API/E2E. |
| Cross-boundary integration realism and mock gap | 98% | 82% | Source/mapping review is strong, but current Nuxt output and compiled builder handoff need execution. |
| Environment, configuration, identity, and fixture fidelity | 97% | 85% | Exact package/worktree identity is preserved; desktop packaging resource placement has not yet been observed through compiled config. |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | 84% | Packaging fail-fast behavior for missing notice still requires an executable negative scenario. |
| User-surface, browser, and desktop-shell confidence | 97% | 94% | User/browser runtime is unchanged and directly proven; desktop packaging placement is the bounded remaining shell-distribution uncertainty. |
| Durable regression coverage quality and relevance | 96% | 90% | The added contract case is relevant but has not yet been API/E2E-executed or proportionally reviewed. |

- Round 2 pre-execution overall confidence: **86.1%** (`(90 + 78 + 82 + 85 + 84 + 94 + 90) / 7`).
- Any applicable category below 90%: `Yes` — changed-boundary directness, integration realism, fixture fidelity, and failure/fail-fast evidence.
- Broader validation decision: `Required`, but targeted at the **web/Electron packaging lifecycle**, not the unchanged VNC browser runtime.
- Browser/live rerun decision: `Not Required` for round 2. The exact prior result and context remain authoritative for unchanged VNC behavior; a repeat would provide no evidence about `extraResources` or packaging preflight.
- Full signed/installable Electron artifact decision: `Not Required` for API/E2E revalidation. Current documented builds require prepared server resources and optional platform signing/notarization. Executing the compiled build preflight and capturing the exact real builder configuration provides direct, proportionate evidence for the only changed path without fabricating signing readiness.
- Expected final confidence: At least 95% overall with no applicable category below 90% if generation, exact-byte identity, compiled mapping, positive config handoff, negative preflight, and focused coverage all pass.
- Durable test review routing: The fourth package-contract case changed after prior review, so a successful revalidation must return the cumulative package to `code_reviewer` for round-2 proportional test-code review before delivery resumes.

### Round 2 Investigation Outcome And Reroute

- Result: `Fail`
- Failing scenario: `VNC-PKG-DESKTOP-001`
- Related requirement/design basis: Requirements dependency-license distribution constraint; `BEH-004`; `DS-007`; delivery reroute requested web/desktop notice shipping; local-fix handoff claims Electron packaging input/output readiness.
- Expected: The documented `pnpm generate:electron` output should satisfy the compiled Electron build's required-notice preflight and allow the exact notice mapping to reach electron-builder.
- Observed: `generate:electron` cleans/rebuilds `dist` and emits the notice at `dist/renderer/THIRD_PARTY_NOTICES/noVNC-1.7.0-g7c36fab.txt`. The compiled build requires `dist/public/THIRD_PARTY_NOTICES/noVNC-1.7.0-g7c36fab.txt`, exits 1, and never invokes electron-builder.
- Preliminary failure origin: `Local Fix / implementation_engineer` — production packaging path/mapping and the new durable contract encode the wrong Electron generated-output directory. This is not an environment, signing, server-resource, or unchanged VNC runtime failure.
- Why the prior positive capture is not sufficient: It ran immediately after `pnpm generate`, which creates `dist/public`. The documented Electron build runs `generate:electron`, which replaces that output with `dist/renderer`; the clean normal sequence fails.
- Browser/live VNC status: Prior 97.1% evidence remains valid and is not the failure origin.
- Confidence gate: A critical changed packaging path fails, so no percentage can produce `Pass`; final round-2 confidence is below the default threshold until the normal Electron generation/preflight sequence succeeds.
- Required routing: Send the complete failure package to `code_reviewer` for focused failure-origin review and owner confirmation. Do not send for successful proportional test-code review yet.

---

## Round 3 Correction Revalidation Addendum — `ba703f842` / `CR-001`

### Correction Basis And Prior-Failure Recheck

- Correction commit: `ba703f842d79dfab03f4c15add73396acdc247a9` over failed packaging commit `7fe03f83e869d5badbf10a35d2898a185c190116`.
- Authoritative source review: round 4 passed at 97.6/100 with `CR-001` resolved and no new findings.
- Prior failing scenario reused: `VNC-PKG-DESKTOP-001`.
- Correction intent: Replace the ambiguous `webOutputPath` with `genericWebOutputPath` (`dist/public`) and `electronRendererOutputPath` (`dist/renderer`); make `NO_VNC_ELECTRON_REQUIRED_NOTICE_FILES` own the canonical-source plus renderer-output preflight tuple; update the fourth durable contract case to assert both Nuxt modes and the Electron-required set.
- Changed durable coverage: The fourth package-contract case changed again after the prior proportional review and requires a new successful proportional test-code review if execution passes.
- Runtime change assessment: None. The correction touches build packaging authority, build preflight, the package-contract case, and implementation handoff only. Prior live VNC evidence remains valid and a browser rerun would not exercise `CR-001`.

### Round 3 Coverage Validity And Execution Decision

| Coverage / Boundary | Decision | Reason | Current Action |
| --- | --- | --- | --- |
| Prior `VNC-PKG-DESKTOP-001` failure | Must Recheck First | Workflow requires the same scenario and origin to be resolved before broader claims. | Run clean `generate:electron -> compiled build` and require builder capture. |
| Generic web notice output | Still Required | Correction introduces a distinct owned generic output identity. | Run `pnpm generate`, assert exact `dist/public` bytes/hash. |
| Electron renderer notice output | Still Required | Corrected preflight now depends on `dist/renderer`. | Run `pnpm generate:electron`, assert exact renderer bytes/hash and absent stale `dist/public`. |
| Missing Electron renderer fail-fast | Still Valid With Updated Path | Negative behavior is approved, but the expected missing path changed from public to renderer. | Execute compiled build from source-only temp cwd and require renderer-path failure before builder. |
| Focused provider/session/notice tests | Still Valid / Changed Case | Original 35 tests remain valid; fourth contract case is updated. | Run 4 files / expected 36 tests. |
| Prior live VNC/browser evidence | Still Valid | Provider/session/browser sources and package version are unchanged across both notice commits. | Preserve without rerun. |
| Full Nuxt/typecheck baseline | Still Valid | Correction cannot affect prior four unrelated full-suite assertions or 242-error baseline. | Preserve prior evidence; no disproportionate rerun. |

### Round 3 Planned Commands And Evidence

| Order | Command / Mode | Required Result | Evidence Path |
| --- | --- | --- | --- |
| 1 | `pnpm install --offline --frozen-lockfile` | Pass exact lock/install | `probes/api-e2e/revalidation-ba703f842/frozen-offline-install.log` |
| 2 | Focused noVNC Vitest set with `--run` | Pass 4 files / 36 tests | `probes/api-e2e/revalidation-ba703f842/focused-novnc-vitest.log` |
| 3 | `pnpm generate` then exact canonical/generic byte/hash check | Pass; exact notice at `dist/public` | `generic-generate.log`; `generic-notice-check.log` |
| 4 | `pnpm generate:electron` then exact renderer byte/hash and mode-separation check | Pass; exact notice at `dist/renderer`, `dist/public` absent | `electron-generate.log`; `electron-notice-check.log` |
| 5 | `pnpm transpile-build` and compiled mapping inspection | Pass; both output identities and Electron-required tuple compiled exactly | `transpile-build.log`; `compiled-mapping.json` |
| 6 | Re-run `VNC-PKG-DESKTOP-001` with compiled `build.js --mac --arm64` and intercepted final builder | Pass; preflight accepts renderer output and builder capture contains exactly one canonical-source -> `THIRD_PARTY_NOTICES/...` mapping | `packaging-normal-electron-flow.log`; `packaging-normal-electron-flow-summary.txt`; `packaging-captured-config.json` |
| 7 | Updated missing-renderer negative preflight | Pass expected failure; exact renderer-path error and builder not called | `packaging-negative.log`; `packaging-negative-summary.txt` |
| 8 | Runtime-diff/forbidden-reference, `git diff --check`, and cleanup | Pass | `final-integrity.log` |

### Round 3 Confidence And Broader-Validation Gate Before Execution

- Starting confidence: **83.3%**, carried from the authoritative round-3 failure result; critical desktop distribution remained failing.
- Broader validation: `Required` against the same packaging lifecycle. Browser/VNC repetition remains `Not Required` because it cannot improve evidence for the corrected output-path boundary.
- Full signed package: Not required before the corrected preflight/config handoff is proven. The intercepted builder boundary is the exact point previously not reached and is sufficient to resolve `CR-001`; prepared server/signing resources remain unrelated.
- Pass target: Reaching builder through the clean normal Electron sequence, retaining exact notice identity across both modes, passing the updated negative preflight and 36 focused tests, overall confidence >=95%, and no category below 90%.
- Routing on pass: `code_reviewer` for round-2 proportional review of the changed fourth package-contract case, then delivery.
- Routing on repeated failure: `code_reviewer` for renewed focused failure-origin review using `VNC-PKG-DESKTOP-001`.

### Round 3 Executed Results And Investigation Outcome

| Planned Order | Executed Evidence | Actual Result | Investigation Consequence |
| --- | --- | --- | --- |
| 1 | Frozen offline install across all 11 workspace projects | Pass | Exact lock and installed dependency remained reproducible. |
| 2 | Focused noVNC set | Pass — 4 files / 36 tests | The corrected fourth package-contract case and unchanged provider/session coverage are executable. |
| 3 | Generic Nuxt generation plus byte/hash inspection | Pass — 3,552 modules; canonical and `dist/public` notices were both 26,305 bytes, byte-identical, SHA-256 `399fad4dac55bd3226ed40c5e4f5c366f44654e1738a037272ff3e6661a097b3` | The generic output identity is directly proven. |
| 4 | Clean Electron Nuxt generation plus byte/hash/mode-separation inspection | Pass — 3,552 modules; exact 26,305-byte notice at `dist/renderer`; stale `dist/public` absent | The corrected Electron renderer identity is directly proven. |
| 5 | Build-script transpilation and compiled mapping inspection | Pass | Compiled authority retains both output identities, the source+renderer required tuple, and canonical-source-to-desktop resource mapping. |
| 6 | Reused `VNC-PKG-DESKTOP-001`: compiled Mac arm64 build from the real Electron-generated state, intercepting only final electron-builder execution and unrelated icon/server preparation | **Pass** — preflight accepted `dist/renderer`, electron-builder was reached, and exactly one noVNC resource mapped canonical source to `THIRD_PARTY_NOTICES/noVNC-1.7.0-g7c36fab.txt` | The prior critical failure is resolved at its exact origin and sequence. |
| 7 | Missing-renderer negative preflight from isolated source-only temp cwd | Pass — exit 1 named the exact missing `dist/renderer/...` path and builder was not called | Correct fail-fast behavior is preserved against the corrected path. |
| 8 | Correction-scope, exact package/notice, forbidden-reference, diff, and owned-resource cleanup checks | Pass | No runtime/provider/session drift, legacy path, task container, temp fixture, or active harness remains. |

- Investigation outcome: `Pass` is supportable at **96.9%** final confidence with every category at or above 95% and every critical requirement directly proven.
- Broader-validation outcome: `Required` packaging lifecycle validation completed successfully. Another browser/VNC run was not required because `ba703f842` does not change the runtime/provider/session/browser boundary; round 2's 97.1% live evidence remains authoritative for that scope.
- Proportionality decision: Mac arm64 is the exact previously failing normal Electron sequence and the mapping is platform-neutral. Repeating a Windows capture or producing a signed installer would add little evidence for the corrected renderer-output preflight; the final builder handoff was captured with its complete `files`, `extraResources`, `publish`, and target configuration.
- Durable coverage routing: No API/E2E-owned durable test changed in this correction round, but `ba703f842` changed the fourth case in `autobyteus-web/tests/integration/novnc-package-contract.integration.test.ts`; successful proportional test-code review is therefore required before delivery.
- Authoritative evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/probes/api-e2e/revalidation-ba703f842/`.
