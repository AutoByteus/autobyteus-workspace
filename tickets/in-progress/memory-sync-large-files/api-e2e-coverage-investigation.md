# API/E2E Coverage Investigation — memory-sync-large-files (Project Task autobyteus-workspace-7)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-003, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts: `probes/large-file-sync-probe.e2e.test.ts.txt` (evidence only; already turned into the durable e2e)
- Design Review Report: `design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record / IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Investigation Round: 3 (round 1 baseline; round 2 = SR-005 ruling and OBS-1; round 3 = rerun of API-08 and API-06a on the OBS-1 fix `542bf871f`)
- Trigger: code review CRR-002 Pass (Large / High), message from `code_reviewer`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file
- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files`, branch `task/memory-sync-large-files`, code under test `077fa6853` (documents `bfcd82366`)

## Current Requirement And Design Basis

Memory Sync's source now (a) cuts batches by count and bytes (24 MiB inline, 4 GiB staged), (b) sends a file above 8 MiB to the hub as raw 8 MiB pieces (GET received bytes, PUT at offset, commit by `contentEncoding: "staged"`), (c) does not read files whose size and mtime equal the last synced record, (d) isolates per-file failures (hub 400/409/413/422), records them with an increasing delay, and shows them in GraphQL status and the Memory Sync card, and (e) keeps connection loss and gate refusals run-level, with the large transfer resuming next run. The hub stores partial files in `memory/memory-sync-staging/<source>/<sha>.partial`, outside `imports/`, verifies size and SHA-256 before a commit, and sweeps abandoned partials. Same-release contract only (`DESIGN.md` rule 9). AC-003/QR-002 (2 GiB, RSS growth < 200 MiB on source and hub) is a measured-once criterion that the implementation's own run reported at 264 / 191 MiB cold and 84 / 74 MiB warm; my independent run decides acceptance.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-006, SCN-007.
- Real-use scenarios added from the handoff and from reading the code, each with its real trigger:
  - RS-1 (Owner clicks Sync now while the background loop is uploading a large file): background worker with `intervalMs` 5 s on a source; a 600 MiB file; `startMemorySync` mutation during the background upload. Expect: exactly one queued manual run; no concurrent runs; both finish; file imported once.
  - RS-2 (Hub process restarts during an upload): SIGKILL the hub mid-upload, restart it on the same port and data dir, next run resumes from the hub's received bytes; the partial on the hub is outside `imports/`.
  - RS-3 (The hub is the user's own node): the hub keeps its owner credential in use for its own UI; the staged routes admit only the memory sync source credential (`node-route-permissions.ts` `/rest/memory-sync` → `MEMORY_SYNC_SOURCE`). Real trigger: a request to the staged routes with the hub's owner credential and with no credential is refused; the source's token works. Also: the card's file-problem block rendered in a window bound to the source, not the hub.
  - RS-4 (Owner reads the card in each language with many problems): 23 failures, one long path, en and zh-CN in a real browser.
- Designer scenarios recorded as unsupported (not tested): SCN-005 (mixed versions).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 batches by bytes, per-file outcomes | Changed | design DS-001; CRR-002 | Existing e2e + unit; rerun at HEAD |
| BEH-002/003/004 staged pieces, no whole-file base64, any size | Added | DS-002; IMP-05 | Independent 2 GiB run (API-07) |
| BEH-005 unchanged files not re-read | Changed | DS-001 | Unit + e2e second run (API-01, API-02) |
| BEH-006 owner sees problems | Added | DS-005 | Web spec + e2e GraphQL + rendered browser (API-06, API-08) |
| BEH-007 staged routes, nothing partial visible | Added | DS-003 | e2e (API-02), restart (API-10), gate (API-11) |
| BEH-008 run-level errors unchanged | Preserved | parser test | unit + existing e2e (API-01, API-02) |
| Run gate: manual queues after background | Changed | AR-002 | RS-1 (API-09) |
| Removed `deferred` scanner field | Removed | handoff | `agent-semantic-memory.e2e` (API-03) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | planner, stager, staged store, import store | 91 unit tests, e2e | none beyond measured memory | rerun + AC-003 run |
| API / transport / contract | Yes | `/rest/memory-sync/v1/.../staged-files/:sha256` GET/PUT; batch `staged` encoding | e2e through counting proxy | hub restart, credentials | Live API (API-10, API-11) |
| Frontend component / state | Yes | `MemorySyncCard.vue`, store, i18n | jsdom spec | real rendering, wrapping, zh-CN | Browser (API-08) |
| Browser integration / user journey | Yes | Nodes → Memory Sync | none | real GraphQL + render | Browser (API-08) |
| Authentication / session / permissions | Yes | new routes under `/rest/memory-sync` gate | unit prefix rule | real credential kinds | Live API (API-11) |
| Desktop renderer / web-equivalent UI | Yes | same card in the desktop renderer | none | web surface proves renderer only | Browser (API-08); desktop shell not changed |
| Desktop shell / Electron-specific | No | none | n/a | n/a | None |
| Process / lifecycle | Yes | run gate, hub sweep, staging expiry | unit, e2e | restart, background overlap | Lifecycle (API-09, API-10) |
| Persisted-data transition | Yes (source state, additive) | `fileFailures` in source state | `memory-sync-file-failures-state.test.ts` | none | none (Directly Usable — No Migration) |
| Worker / queue / distributed coordination | Yes | background worker + manual queue; two nodes | e2e with `backgroundEnabled: false` | background trigger never used | Worker (API-09) |
| External integration | No | none | n/a | n/a | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files`
- Project type and runtime stack: pnpm monorepo, TypeScript (Node v26.12.0 on this machine), Fastify + GraphQL server, Nuxt/Vue web; vitest; playwright-core for browser probes.
- Project testing guideline path(s): `TESTING.md` (repository root; no closer `TESTING*.md`). It exists; I do not need to create one.
- Conflicting, missing, or unclear project instructions: `pnpm` is not on PATH; the shim `/tmp/msync-bin/pnpm` (`npx --yes pnpm@10.28.2`, the version the root `packageManager` names) is used. TESTING.md's browser-probe frontend start uses `corepack pnpm dev`; no corepack on this machine, so the shim is used.
- Changed build-input paths (guideline list vs `git diff --name-only 3d738de6e...HEAD`): `autobyteus-web/generated/graphql.ts` (matches `autobyteus-web/generated/**`). No manifest, lockfile, tsconfig, script or workflow change. Fresh-start build case: API-12.
- Required environment variables or secrets available: `N/A` (no provider keys are needed; nodes are test-owned with a launch owner credential, never printed).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | global strategy | server unit `pnpm -C autobyteus-server-ts test:unit`; server E2E with a clean env (`env -i PATH HOME=<temp> TMPDIR`), builds `dist` first; web `test:nuxt`; typecheck; browser probes own their stack, allowed origins and owner credential; one heavy run at a time; fresh-start build rules |
| `AGENTS.md` (root) | pointers | read DESIGN/TESTING/RELEASE |
| `autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs` | probe credentials | `probeNodeEnvironment`, `attachToBrowserContext` |
| `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs` | template for a probe-owned backend + Nuxt dev server + Chrome | node start with `AUTOBYTEUS_ALLOWED_ORIGINS`, `BACKEND_NODE_BASE_URL` for `pnpm dev` |
| `tests/e2e/memory-sync/memory-sync-large-files.e2e.test.ts` | existing two-server harness | reused as the basis of RS probes |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Hub and source servers | worktree `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <temp>` after `tsc -p tsconfig.build.json` + `copy-build-assets.mjs` | own temp data roots | `GET /rest/health` | SIGTERM, then delete temp root |
| Nuxt dev frontend | `autobyteus-web` | `pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL` | free port chosen before nodes start (allowed origins) | `GET /nodes` 200 | kill process group |
| Headless Chrome | system Chrome via playwright-core | `chromium.launch({executablePath})` | | page load | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| 2 GiB, 4 GiB and 600 MiB source files | generated by the probe from a repeated random block, written under the temp source memory dir | temp dir under `$TMPDIR`; ~6 GiB free needed | removed with the temp root |
| Hub enabled + source configured | GraphQL `updateMemoryHubConfig`, `updateMemorySyncSourceConfig` (as the e2e does) | token read from the mutation result, never printed | temp roots |
| Failing files for the card | corrupting proxy as the e2e does, plus `agents/<run>/…` long paths | test-owned | temp roots |

## Persisted Data Transition Coverage Basis

- Approved decision: source state `Directly Usable — No Migration`; hub staging and manifest `Not Affected`.
- References: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative setup and behavior: a source state file without `fileFailures` reads as `{}` (unit `memory-sync-file-failures-state.test.ts`). In API-02 and the live probes the source state is also reused across a restart-free sequence; the existing-state read is covered by the unit test.
- Migration-specific scenarios: none (not `Migration Required`).
- Upstream ambiguity: None.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/memory-sync/*.test.ts` (14 files) | planner, stager, staged store, commit, sweep, failure policy, state, run outcomes, response parser, hold back | AC-002, 004, 009, 011; AR-001..008 | Still Valid | read test names, IMP-01 | rerun (API-01) |
| `tests/e2e/memory-sync/memory-sync-large-files.e2e.test.ts` | 40 MiB + 20 MiB files, dedup, resume, per-file failure | AC-001, 002, 004, 005, 009, 010 | Still Valid | read in full | rerun (API-02) |
| `tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | inline batch contract | AC-008 | Still Valid | IMP-02 | rerun (API-02) |
| `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts`, `memory-sync-held-back-graphql.e2e.test.ts`, `raw-trace-manifest-runtime-names-sync.e2e.test.ts` | multi-process sync, held back gate, trace names | AC-006, AC-008 | Still Valid | IMP-02 | rerun (API-02) |
| `tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` | semantic memory e2e; edited for the removed scanner `deferred` field | regression of scanner result shape | Needs inspection (edited by implementation, not run) | diff read in API-03 | run (API-03) |
| `tests/architecture/*` (tracked-imports, application-framework-boundaries, web-generated-graphql-current) | repository rules | DESIGN.md | Still Valid | IMP-01 | rerun (API-01) |
| `autobyteus-web/components/settings/__tests__/MemorySyncCard.spec.ts` | card under jsdom, 7 tests | AC-010 | Still Valid | IMP-04 | rerun (API-06) |
| `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | embeds the card | regression | Still Valid | not run by implementation | run (API-06) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-002, 004, 006, 009, 011 | server unit + architecture | Existing Test | `vitest run tests/unit/memory-sync tests/architecture/{tracked-imports,application-framework-boundaries,web-generated-graphql-current}` | code changed since IMP-01 (a deletion): rerun is cheap |
| API-02 | AC-001, 002, 004, 005, 008, 009, 010 | server E2E, two real processes | Existing Test | `vitest run tests/e2e/memory-sync` in `env -i` | HEAD differs from IMP-02's commit in the staged store |
| API-03 | regression | server E2E | Existing Test | `vitest run tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` | not run by implementation |
| API-04 | all | server typecheck | Reused | IMP-03 | only a function deletion with no caller since (IMP-06 `tsc -p tsconfig.build.json --noEmit` at HEAD passed; confirm by `git grep`) |
| API-05 | regression | full server unit suite | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | not run by implementation; TESTING.md says it is kept green; known environment failures must have a cause |
| API-06 | AC-010 | web unit + typecheck + guards | Existing Test | `vitest run` of the card spec, NodeManager spec; `node scripts/typecheck.mjs`; localization guards | gates the implementation did not run |
| API-07 | AC-003, QR-002, REQ-002, REQ-004 | two real servers, 2 GiB | Temporary Probe | independent harness: cold 2 GiB (fresh processes), warm 2 GiB (after a 1 KiB staged-size sync), 30 MiB cold control, repeat cold once; RSS of both processes sampled every 250 ms; hash compared by stream | measured-once criterion, not a CI test |
| API-08 | AC-010, REQ-007 | browser (Nuxt dev + real source node), en and zh-CN | Journey | real source with 23 failing files via corrupting proxy, one very long path; screenshots, DOM assertions | jsdom-only so far |
| API-09 | REQ-005, AR-002 | worker / run gate | Journey | RS-1 | background overlap never run for real |
| API-10 | REQ-003, AC-005, AC-009 | lifecycle | Journey | RS-2 | hub restart |
| API-11 | AC-006, access gate | live API | Journey | RS-3: staged routes with owner credential, no credential, wrong token, source token | hub as the user's own node |
| API-12 | build inputs | fresh-start build | Journey | fresh `git clone --no-local`, `pnpm install --frozen-lockfile`, web `typecheck` and guards, then the desktop build command as far as the machine allows | `generated/graphql.ts` matches a build input |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

None planned. RS-1 and RS-2 are ticket-scoped temporary probes (they need hundreds of MiB, a hub kill and timing of a background loop, which TESTING.md says a CI e2e should not carry); if a case exposes a defect, a durable regression test is added with the fix. A scaled-down durable case for RS-1 would duplicate `memory-sync-run-outcomes.test.ts`'s run-gate unit coverage.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron app; the card is renderer-only (no preload, IPC or window change in the diff).
- Web-equivalent behavior: the card render, localization and the GraphQL calls; proven by a browser probe on the Nuxt dev server against a real source node.
- Shell-specific or lifecycle behavior: none changed.
- Chosen approach: browser probe (`TESTING.md` "Renderer UI … Web unit tests + a browser probe"). An isolated desktop instance would add only the shell, which this change does not touch, at the cost of a full desktop build; not run.
- How the run avoids disturbing the user's running app: own ports, data roots, HOME; no use of `~/.autobyteus`.

## Live Environment And Fixture Plan

- Startup order: build `dist` (tsc + copy assets) → hub → source (→ proxy) → Nuxt dev bound to the source → Chrome.
- Health checks: `/rest/health`, Nuxt page 200, card panel visible.
- Evidence: RSS time series json, imported hash comparisons, request logs of the proxy, server logs, screenshots, DOM text dumps.
- Owned processes to clean: all servers, Nuxt dev (process group), Chrome, temp roots, large files.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Signed/notarized desktop packaging, other OS | needs the release runner | low (renderer/server only change) | No | delivery |
| A real remote hub over a home network | no second machine | latency-only; the transfer is HTTP pieces, resumable | Yes (optional) | none |
| 10 GiB file | design non-goal; size-independence shown with 2 and 4 GiB | low | No | none |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| AC-003 literal reading: "RSS growth during the transfer stays below 200 MiB"; the implementation's cold figure for the source is 264 MiB | to be decided by my independent run | IMP-05; CRR-002 residual risk 1 | If the cold figure is binding: Solution Designer (design escalation trigger), not implementation |
| (Resolved, round 2) AC-003/QR-002 were restated by SR-005 / DEC-008: peak RSS growth over idle below 400 MiB for 2 GiB and ≥ 4 GiB files, first transfer of a fresh process included, on Node 22 and the desktop's Node 24 | none left; API-07's evidence judged against it | `handoff-sr-005.md`; requirements-doc AC-003, QR-002, DEC-008 | Solution Designer (done) |
| OBS-1 card row words split (`break-all` on the whole row): promoted to a Local Fix by the Solution Designer | `Local Fix` | API-08 screenshots | implementation_engineer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: plan updated in place if evidence changes it.
