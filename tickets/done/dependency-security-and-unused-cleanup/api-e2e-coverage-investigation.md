# API/E2E Coverage Investigation — dependency-security-and-unused-cleanup

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-005 basis; DEC-001…DEC-008)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-005)
- Supplemental Task Artifacts: `evidence/SD-00…SD-08`, `probes/`, `follow-ups.md` (FU-001…FU-010), `handoff-sr-00{1,2,3,5}.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-005, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-003). Per the code reviewer, its lines L31, L152, L166 and L205 are leftovers from earlier rounds. `download-media-tool.ts` L118 is changed (DEC-007), and IMP-DI-002 is resolved (DEC-008).
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass 9.4)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (after the first result)
- Current API/E2E Revision ID: `N/A` until `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 (reviewed route, `Medium` / `High`)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The change raises three direct specifiers: web `tar` `^7.5.22`, `autobyteus-ts` `undici` `^7.29.1` (→ `^7.30.1`), and Electron exact `42.11.16`. It removes 17 unused declarations (DEC-005) and moves every in-range vulnerable package to its newest in-range version, one name per `pnpm update`, then dedupes. It holds `dompurify` at exact 3.4.7 (DEC-008), updates `markdown-it` to 14.3.3 (step 5), and changes one type-level line in `download-media-tool.ts` (DEC-007). Source commits: `9936445f55`, `79ece48bf4`, `7da874ed2b`. Head `10126a016a` adds only docs.

API/E2E owns design step 7 (AC-005…AC-008) and a fresh audit (AC-001/AC-002); AC-003/AC-004 are rechecked cheaply. Escalation trigger: a suite, build, packaged app or image fails because of an update and the cause is not a local test fix; an update needs an override or a non-type source change.

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001 (patched dependencies → audit), SCN-002 (removals), SCN-003 (desktop app on Electron 42.11), SCN-004 (build, package, run).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - **Rendered agent output in a conversation** (`dompurify` 3.4.7, `markdown-it` 14.3.3, `@mdit/plugin-katex`, `mermaid` 11.17.2, `vue` 3.5.44): an agent replies with headings, a code block, KaTeX math and a mermaid diagram, and the user reads it in the packaged app's conversation view. Driven by a native AutoByteus agent on LM Studio in an isolated instance; DOM asserted over the instance's control port (API-21).
  - **Local LLM call through `undici`** (`autobyteus-ts/src/llm/transport/local-long-running-fetch.ts`, used by `LMStudioLLM` and `OllamaLLM`): the same native run (packaged), plus the LM Studio integration file of `autobyteus-ts` with a loaded model (API-12). Its multimodal case with `userProvidedImageUrl` (`http://192.168.2.124:29695/…`, a LAN address on the user's app port) is excluded by name filter to avoid touching the user's running app (TESTING Rule 2).
  - **Voice-input runtime extraction with `tar`** in Electron main: `voice-input-extension.integration.test.ts` (API-11).
  - **Server GraphQL / GraphiQL** (`mercurius` 13, `@fastify/static` 7 kept): health, a GraphQL query and the GraphiQL page in the Docker container (API-30) and the packaged server.
- Recorded `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 runtime libraries patched | Changed (versions) / Preserved (behavior) | IMP-03, IMP-08, IMP-11 | Full rerun of every suite + packaged app + Docker |
| BEH-002 build/test tooling patched | Changed (versions) | IMP-03 | Every build; web guards; applications |
| BEH-003 unused declarations removed | Removed | IMP-05 | Reuse IMP-05 / IMP-11 provider check; builds prove nothing needed them |
| BEH-004 `dedupe --check` passes | Changed | IMP-02, IMP-11 | Recheck (API-01) |
| BEH-005 Electron 42.11.16 | Changed | IMP-06 | Packaged app version + harness + isolated instance |
| DEC-007 download tool line | Changed (types only) | IMP-08 | `autobyteus-ts` suite |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes (library versions) | server/`autobyteus-ts` dependencies | unit/integration suites | real HTTP/WebSocket server | Server E2E (`pnpm test:e2e`) |
| API / transport / contract | Yes | `ws`, `@fastify/busboy`, `fast-uri`, `mercurius` deps, `axios`, `undici` | suites | live local LLM fetch; packaged and Docker server | LM Studio suite; packaged; Docker |
| Frontend component / state | Yes | `vue`, `nuxt`, `dompurify`, `markdown-it`, `mermaid` | `test:nuxt` (happy-dom) | real Chromium rendering | Isolated instance DOM checks |
| Browser integration / user journey | Yes | conversation rendering | — | — | Isolated instance (Electron renderer) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Nuxt build in Electron 42.11 | `nuxt build` | renderer at run time | Isolated instance |
| Desktop shell / Electron-specific integration | Yes | Electron 42.4.1 → 42.11.16; `electron-updater`; `tar` | `test:electron` | packaged launch, native modules (`node-pty`) | `test:e2e:electron*`, isolated instance |
| Process / lifecycle | Yes (packaged start/stop) | — | — | — | Packaged harness |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | npm advisory database (point in time); LM Studio | — | new advisories | fresh audit (API-02) |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup` (branch `codex/dependency-security-and-unused-cleanup`). Base counts: a test-owned worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup-base` at `3b2c86ca9e`.
- Project type and runtime stack: pnpm 10.28.2 monorepo, Node 22.23.1; Nuxt web, Electron desktop, Fastify server, Docker image.
- Project testing guideline path(s): `TESTING.md` (root); no closer guideline.
- Conflicting, missing, or unclear project instructions: none. Rule 9 vs the ticket's no-source-change rule for FU-010 is already recorded by implementation.
- Required environment variables or secrets available: `N/A` (no provider keys needed; LM Studio is local).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global guideline | layer commands; "Rerun" all when the lockfile changes; `env -i PATH HOME=<resolved temp> TMPDIR` for e2e and `autobyteus-ts` integration; LM Studio one run at a time, unload after; isolated instances; Docker test containers on 127.0.0.1 without user volumes; Rule 9 |
| `autobyteus-server-ts/AGENTS.md` | server commands | `test:integration:prepare` once, then `test:integration` |
| `autobyteus-web/package.json` | web | `test:nuxt`, `test:electron`, guards, `build`, `build:electron:mac` |
| `README.md` "Packaged Electron API/E2E testing", `docs/isolated-app-instances.md` | packaged harness, isolated instances | `pnpm -C autobyteus-web test:e2e:electron`, `test:e2e:electron:isolation`, `test:e2e:isolated-app`; `isolated-app start --from-worktree` |
| `/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser` | instance control | `CHROME_REMOTE_DEBUGGING_PORT=<controlPort> BROWSER_AUTOMATION_ATTACH_ONLY=1` |
| `applications/*/package.json` | applications | `build`, `typecheck:backend` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Branch builds + suites | branch worktree | scripted sequence (API-03…API-13), serialized | — | exit codes | — |
| Base suites (counts) | base worktree | same sequence | runs in parallel with the branch (different worktree) | exit codes | `git worktree remove --force` |
| Packaged app | branch worktree | `pnpm -C autobyteus-web build:electron:mac` after the branch suites | — | `verify-packaged-server-startup.mjs` | untracked output |
| Isolated instance | branch worktree | `pnpm --silent isolated-app start --from-worktree` | LM Studio model loaded just in time | `start` JSON | `isolated-app stop <id>`; `lms unload` |
| Docker image | branch worktree | `docker buildx build -f autobyteus-server-ts/docker/Dockerfile.monorepo --load --platform linux/arm64` | test tag | `/rest/health` | `docker rm -f -v`, `docker rmi` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Conversation with markdown | GraphQL `createAgentDefinition` + `createAgentRun` (native, LM Studio) + agent WebSocket `SEND_MESSAGE`; then open the run in the UI | own data root | removed on stop |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| All suites of every package | product behavior | AC-005, AC-006 | Still Valid | IMP-06, IMP-08, IMP-12 | Rerun all on head (lockfile changed) |
| `autobyteus-ts/tests/unit/tools/multimedia/download-media-tool.test.ts` (2 new cases) | content-type → extension | DEC-007 | Still Valid (reviewed CRR-001) | IMP-08 | Inside the `autobyteus-ts` suite |
| Markdown specs (`TextSegment`, `ThinkSegment`, `MarkdownRenderer`) | headings survive sanitizing | DEC-008 | Still Valid | IMP-12 | Inside `test:nuxt` |
| `NotificationCenter.spec.ts` | notification order | — | Still Valid; timing defect proven (FU-010) | IMP-12 | Classify per FU-010 if it fails |
| `package-auto-refresh.integration.test.ts` | watcher lists new folders | — | Still Valid; intermittent, cause unknown (FU-008) | IMP-10 | If it fails: base comparison (Rule 9) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-004 | removals, import providers | Reused | IMP-05, IMP-11 | Manifests/lockfile unchanged since `7da874ed2b` |
| API-01 | AC-003, AC-005 | install, dedupe | Existing Test | `pnpm install --frozen-lockfile`; `pnpm dedupe --check` | Head state |
| API-02 | AC-001, AC-002 | audit | Temporary Probe | `pnpm audit --prod --json`, `pnpm audit --json`; compare to the findings table; newly published advisories per step 5 | Advisory database moves |
| API-03 | AC-005 | contract/SDK builds and tests | Existing Test | `pnpm -C <pkg> build && pnpm -C <pkg> test` (6 packages) | Rerun |
| API-04 | AC-005, AC-006 | `autobyteus-ts` build + test | Existing Test | `pnpm -C autobyteus-ts build`; `env -i … pnpm -C autobyteus-ts test` | Rerun |
| API-05 | AC-005 | server prebuild/build/typecheck | Existing Test | `pnpm -C autobyteus-server-ts prebuild && build && typecheck` | Rerun |
| API-06 | AC-006 | server unit | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | Rerun |
| API-07 | AC-006 | server integration | Existing Test | `test:integration:prepare` + `test:integration` | Rerun |
| API-08 | AC-006 | server e2e (incl. MCP/HTTP e2e) | Existing Test | `env -i PATH HOME=<temp> TMPDIR pnpm test:e2e` | Rerun |
| API-09 | AC-005, AC-006 | web guards, `nuxt build`, `test:nuxt`, `test:electron` | Existing Test | the package scripts | Rerun |
| API-10 | AC-005 | applications | Existing Test | `pnpm -C applications/<app> typecheck:backend && build` (2 apps) | Rerun |
| API-11 | AC-006 | voice-input `tar` extraction | Existing Test | `vitest … voice-input-extension.integration.test.ts` | Named in AC-006 |
| API-12 | AC-006 (undici) | LM Studio via `undici` | Existing Test (live local) | `env -i … LMSTUDIO_TARGET_TEXT_MODEL=… vitest run tests/integration/llm/api/lmstudio-llm.test.ts -t <all but multimodal>` with the model loaded | `undici` local fetch |
| API-13 | DEC-007, AC-006 | `DownloadMediaTool` over real HTTP on axios 1.20 | Existing Test (with its local-server input) | `AUTOBYTEUS_MEDIA_LOCAL_BASE_URL=<local PNG server answering 'image/png; charset=binary'>` + the integration file | Added during execution to close the confidence gap: the changed line with a parameterized real header |
| API-B | AC-006 (before counts) | same suites on base | Existing Test | API-04, 06, 07, 08, 09 on the base worktree | Before/after counts |
| API-20 | AC-007 | packaged server start; packaged Electron harness | Existing Test | `build:electron:mac`; `verify-packaged-server-startup.mjs`; `test:e2e:electron`, `test:e2e:electron:isolation`, `test:e2e:isolated-app` | Packaged |
| API-21 | AC-007, DEC-008 | isolated instance: Electron version, conversation view with headings, code, KaTeX, mermaid | Journey | `isolated-app start --from-worktree`; native LM Studio agent run; open the run in the UI; DOM checks over the control port; screenshot | Real renderer |
| API-30 | AC-008 | Docker image | Temporary Probe | build; `docker run` on 127.0.0.1; health, GraphQL query, GraphiQL page; cleanup | Image |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None planned. The ticket changes dependency versions; the existing suites are the regression guard. The rendering journey is a temporary probe because it needs a live model and a packaged app.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron 42.11.16, packaged mac-arm64 build of the branch.
- Testing guideline, README, or development instructions used: `TESTING.md`, `README.md` (Packaged Electron API/E2E testing), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: conversation rendering (also covered by `test:nuxt` under happy-dom).
- Shell-specific or lifecycle behavior: Electron version, packaged launch/isolation, embedded server start.
- Chosen validation approach: packaged harness scripts + one isolated instance driven over its control port.
- How the run avoids disturbing an already-running desktop application: own ports and data roots; only my instance ids are stopped.

## Live Environment And Fixture Plan

- LM Studio `qwen/qwen3.6-35b-a3b` loaded just in time, one run at a time, unloaded after.
- Evidence: DOM assertions (element counts and text), a screenshot, `process.versions.electron`.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Packaged Linux/Windows builds | No such host | Low; same lockfile; CI at release | No | None |
| The LM Studio multimodal case with `userProvidedImageUrl` | It targets a LAN address on the user's app port (Rule 2) | None for `undici` (text, streaming and tool cases use the same fetch) | No | None |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
