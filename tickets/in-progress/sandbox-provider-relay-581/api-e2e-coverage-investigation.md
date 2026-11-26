# API/E2E Coverage Investigation: autobyteus-581

## Investigation Meta

- Requirements Doc: `tickets/in-progress/sandbox-provider-relay-581/requirements-doc.md` (approved; REQ-001 to REQ-018; DEC-101 to DEC-118)
- Investigation Notes: `…/investigation-notes.md` (P-1 to P-14)
- Solution Revision Record: `…/solution-revision-record.md` (SR-001 to SR-010)
- Design Spec: `…/design-spec.md` (SR-007, with the SR-008/009 decisions in the requirements)
- Supplemental Task Artifacts: `…/history-484/*` (contract V-7 reader rule), `…/probes/*`, `…/follow-ups.md`, the public skill `autobyteus-sandboxes/SKILL.md` (skills worktree `/Users/normy/autobyteus_org/autobyteus-skills-worktrees/autobyteus-sandboxes-581`, `f85b30a`)
- Design Review Report: `…/design-review-report.md` (round 3, Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Handoff: `…/implementation-handoff.md` (IR-003)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-003, Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `…/api-e2e-revision-record.md` (written after this round's result)
- Current API/E2E Revision ID: `API-REV-002` (round 2); `API-REV-001` (round 1, Fail: F-1, F-2)
- Current Investigation Round: 2
- Trigger: round 1 `/code_reviewer` CRR-003 pass (code `d624f09ce6`); round 2 `/code_reviewer` CRR-005 pass of IR-004 (code `7296a698d6`, fixes F-1 and F-2)
- Prior Investigation Reviewed: round 1 (this file)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

A relayed node (`AUTOBYTEUS_PROVIDER_RELAY_PEER` and the C1 lists, read once at start) sends every supported runtime's model calls through its local relay to a paired relay node. The relay node checks the declared `relayCredentialKind`, attaches exactly that credential, marks the reply and writes one C5 line. Supported:
- API key: native, Claude, Codex, Grok, DeepSeek Harness.
- Login token: Claude and Grok only. Codex is not supported (DEC-116); Antigravity is not supported (DEC-101).

A host node creates sandboxes through `create_sandbox`, `run_in_sandbox` and `destroy_sandbox`. A sandbox is:
- one container from the host's release image (here `AUTOBYTEUS_SANDBOX_IMAGE`);
- paired as a normal peer marked `role: sandbox`, and relayed through the host;
- given fresh mapped folders, imported packages and read-only shared folders;
- full network;
- used and removed only by the creating run (DEC-117);
- removed at destroy, at expiry and at the host's start;
- free of any credential.

REQ-015 (no link following) is a reader rule in the skill and the tool description; there is no code mechanism (code review C-05). DEC-118 holds AC-005's live part until the user provides a Claude setup-token and a fresh Grok login.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (relayed runs), SCN-003 (evaluator journey), SCN-004 (expiry and start sweep), SCN-005 (owner-managed relayed node, outside Docker). SCN-002 (login tokens) has an automated part now; its live part waits for DEC-118.
- Real-use scenarios added from the implementation:
  - SCN-A1, parallel creation: an evaluator starts several sandboxes at once, which is the stated "parallel work" motive. Trigger: concurrent `create_sandbox` calls. It exercises the R-B serialization at the 4-sandbox limit.
  - SCN-A2, the host unpairs a sandbox peer while the sandbox runs. Trigger: the owner removes the peer on the Nodes page, or a destroy races with a run. The sandbox's next call must be refused (AC-003 live), never a local fallback.
  - SCN-A3, a crash restart of the host with live sandboxes and a lost sandbox list. Trigger: the host is killed and the `sandboxes.json` entry is gone; the requirements accept that loss. The sweep must still find containers by label and unpair the orphaned `sandbox` peers (R-A).
  - SCN-A4, the sandbox's delegated agent answers with a file through `send_message_to`. Trigger: AC-015's journey with a real model in the sandbox.
- Technically possible but unsupported (not tested): SCN-X (a sandbox relaying to a third node, nested sandboxes, Antigravity in a sandbox).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 relayed runtime launches | Added | design DS-001, IMP-08 | Live turns per runtime inside a sandbox and on an owner-managed relayed node (SCN-005) |
| BEH-001 "setting empty" | Preserved | REQ-001, AC-002 | Whole suites + a live direct turn on the unrelayed host |
| BEH-002 relay node handler | Added | DS-002, two-node integration test | Integration suite; live C5 lines; secret scan of the log |
| BEH-003 status | Changed | DS-005 | Live sandbox sign-ins; unit/E2E suites |
| BEH-004 native endpoint | Added | FU-003 | Live native turn in a sandbox and on the relayed node |
| BEH-005 `create_sandbox` | Added | DS-003 | Live creation, timing (QR-001), refusals (AC-014) |
| BEH-006 use and removal | Added | DS-006 | Live `run_in_sandbox`, destroy, expiry, restart sweep, caller rule |
| BEH-007 pairing with role | Added | C11 | Live role, Nodes page label rendered, delegation with a file |
| Peer `role` in `peers.json` | Changed (persisted) | Directly Usable — No Migration | Existing unit test (row without `role`); live write/read |
| Relayed body limit (QR-004) | Added | C4 32 MiB | New durable integration case |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | relay access, handler, sandbox manager | unit + two-node integration test | real Docker, real providers | Live API |
| API / transport / contract | Yes | `/rest/remote/provider-relays/…` (signed), tools C7 | integration test with the real gate | Docker networking, 32 MiB through the real route | Live API + new integration case |
| Frontend component / state | Yes | Nodes page `sandbox` label | NodeRow spec (IMP-05) | rendering from a real node's peer list | Browser probe |
| Browser integration / user journey | Yes (label only) | Nodes page | — | as above | Browser probe |
| Authentication / session / permissions | Yes | peer signing, gate admission of the relay route, unpair refusal, caller rule | integration test | live unpair while the sandbox runs | Live API |
| Desktop renderer / web-equivalent UI | Yes (label) | as above | — | — | Browser probe (web-equivalent) |
| Desktop shell / Electron-specific integration | Yes | `AUTOBYTEUS_RELEASE_VERSION` into the embedded server env | Electron spec (IMP-06) | image name from a real release version | Reused IMP-06; image tag rule by unit test |
| Process / lifecycle | Yes | container start/stop, expiry, start sweep | unit tests with a fake Docker | real Docker, crash restart | Lifecycle (live) |
| Persisted-data transition | Yes | `peers.json` `role`, `sandboxes.json`, activity log | unit test | — | Live read of the files |
| Worker / queue / distributed coordination | Yes | two nodes (host and sandbox) | integration test (in-process) | two real processes over Docker networking | Live (Worker or Distributed) |
| External integration | Yes | Anthropic, OpenAI, xAI providers; Docker Desktop; runtime CLIs in the image | none (fakes) | real providers accepting relayed calls | Live API with the test vault |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay`, branch `codex/sandbox-provider-relay`, code `d624f09ce6`.
- Project type: pnpm monorepo. Node 22.23.1 server (Fastify, GraphQL, WebSocket), autobyteus-ts, Nuxt/Electron web, Docker server image.
- Testing guideline: `TESTING.md` (root). No closer `TESTING*.md` under the changed paths.
- Conflicting instructions: `startBuiltTestServer` defaults to the shared `tests/.tmp/live-e2e-runtime` root and the `.env.test` database. My live cases pass their own `runtimeRoot` and `databaseUrlOverride` so they never collide with other runs.
- Changed build-input paths: `autobyteus-web/generated/graphql.ts`. That requires the Fresh-start build (desktop job; case API-R09). Nothing else in the list changed (no manifests, lockfile, tsconfig, docker, workflows, contracts).
- Secrets available:
  - Test vault: anthropic, openai, grok, deepseek, gemini, glm and kimi keys present.
  - `provider.anthropic.login-token` is missing.
  - The user's Grok login expired (last renewal 07:19Z).
  - Hence DEC-118.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Choosing the path (tool units) | A tool unit registered at start | Whole server `test:unit`, whole `test:integration`, whole `pnpm test:e2e`, plus a search of the gated suites for exact tool lists |
| `TESTING.md` § Both typechecks | Any TS change | `pnpm -C autobyteus-web typecheck` and `pnpm -C autobyteus-server-ts typecheck` |
| `TESTING.md` § Fresh-start build | Build input changed | `git clone --no-local`, `pnpm install --frozen-lockfile`, then the desktop job's `build:electron:mac -- --arm64` and its verify steps |
| `TESTING.md` § Sandbox nodes | Live sandboxes | Test-owned host; `AUTOBYTEUS_SANDBOX_IMAGE` = the beta image with this worktree's server package; `docker ps -a --filter label=autobyteus.sandbox` empty afterwards |
| `TESTING.md` § Docker server nodes, Test vault, Clean environment | Isolation | `docker buildx … --target server-package --platform linux/arm64`; vault via `testVaultSetting`; `env -i` for E2E |
| `tests/e2e/restart-resume/running-runs-docker-node.e2e.test.ts` | Pattern for a gated Docker suite | Gate variable, package or image variable, evidence dir, own-file credential attachment |
| `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs`, `fixtures/probe-node-access.mjs` | Pattern for the Nodes page in a browser against a built node | `nuxt dev` with the development owner credential; `AUTOBYTEUS_ALLOWED_ORIGINS` |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Built host node | `startBuiltTestServer({ runtimeRoot, databaseUrlOverride, testVaultSetting, environment })`; `child` for a kill |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Validation image `autobyteus-server:581-api-e2e` | worktree | `docker buildx build -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package --platform linux/arm64 --output type=local,dest=/tmp/api581/img/server-package .`, then `FROM autobyteus/autobyteus-server:beta` + `COPY server-package/ /opt/autobyteus/server-package/` | Built from `d624f09ce6`. The implementation's `581-local` image predates CR-003 and the Codex removal. | `docker image inspect` | `docker rmi` at the end |
| Host node (built) | `autobyteus-server-ts` | `startBuiltTestServer` with the test vault, `ENABLE_REMOTE_COLLABORATION=true`, `AUTOBYTEUS_SANDBOX_IMAGE`, scripted AGY for the scripted evaluator | own runtime root under `tests/.tmp/api581-*`, own SQLite | `Server listening` | `stop()`, `removeOwnedTestRuntime` |
| Sandboxes | Docker Desktop | via the tools | 6 GiB / 4 CPU caps each | tool result, C6 `ready` | `destroy_sandbox`; failsafe `docker rm -f -v` by label |
| Nuxt dev + headless Chrome (AC-015) | `autobyteus-web` | as in `remote-nodes-page-probe.mjs` | free ports | page loaded | killed by the probe |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent package for the sandbox | Temp folder with `agents/<name>/agent.md` + `agent-config.json` (default launch: native Anthropic haiku) | test-owned | removed |
| Evaluator agents | GraphQL `createAgentDefinition` on the host. Scripted AGY for the deterministic suite; a real model for AC-016 | test-owned DB | removed with the runtime root |
| Skill for AC-016 | A temp skill source folder holding a copy of `autobyteus-sandboxes/` (`addSkillSource`) | copy only; the skills worktree is untouched | removed |
| Owner credentials | `startBuiltTestServer` (host); setup code over `docker exec` (sandbox) | never printed or stored | memory only |
| Provider keys | test vault (read-only) | never printed; the leak scan holds them in memory only | — |

## Persisted Data Transition Coverage Basis

- Approved decision: new files Not Affected; `peers.json` `role` Directly Usable — No Migration.
- References: design § Persisted Data; handoff § Persisted Data Transition Check.
- Representative existing data: a peer row with no `role` (unit test `peer-sandbox-role.test.ts`, which runs in the whole unit suite). Live: a normal peer (SCN-005 pairing) reads as `role: null` beside a sandbox peer.
- Evidence: the unit suite plus the live peer list.
- Migration-specific: N/A.
- Reroute: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/integration/credential-proxy/provider-relay-peer.integration.test.ts` | Two-node C4 with the real gate, signing and handler; kinds, refusals, C5 | AC-001, 003, 004, 005 (automated), 006 | Still Valid; gap: no body-size case | read | Add QR-004 case (API-R07) |
| `tests/integration/credential-proxy/provider-relay.integration.test.ts`, `credential-proxy-host…`, `…git-smart-http…` | Local relay, unrelayed DeepSeek, GitHub forwarder | AC-002, BEH-002 | Still Valid | read | Run in whole integration |
| `tests/unit/sandboxes/sandbox-manager.test.ts` | Lifecycle with a fake Docker; refusals; caller rule; sweep | AC-012, 013, 014 | Still Valid | read (CRR-003) | Run in whole unit |
| `tests/unit/credential-proxy/{provider-relays,relay-login-token-reader,relayed-launch-shapes,credential-proxy-core}.test.ts` | C3 table, login reader, launch shapes per runtime and kind | AC-004, 005, 007, BEH-004 | Still Valid | — | whole unit |
| `tests/unit/remote-collaboration/peer-sandbox-role.test.ts` | Role saved from the invite; tolerant reader | REQ-017, persisted data | Still Valid | — | whole unit |
| `tests/unit/startup/agent-tool-loader.test.ts` | Tool registration | REQ-016 | Still Valid | — | whole unit |
| `tests/e2e/node-access/node-access-model.e2e.test.ts` (NAS-42..44) | Node access scenarios for the relay route | REQ-002 | Still Valid | — | whole E2E |
| Gated `tests/e2e/runtime/codex-agent-tools-empty-list.e2e.test.ts` (RUN_CODEX_E2E) | Codex accepts an empty Agent Tools list | tool exposure | Still Valid (sandbox tools are opt-in) | grep | Run gated (no model) |
| Gated `tests/e2e/runtime/search-memory-default-tool-live.e2e.test.ts` (SEARCH_MEMORY_LIVE_E2E=agy) | `tools/list` has `search_memory` once | tool exposure | Still Valid | grep | Run gated, scripted (no model) |
| Gated `tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | send_message routing over the Codex Agent Tools MCP | tool exposure | Out Of Scope for exact lists (spreads the session's `enabled_tools`, asserts no list equality) | grep | Not run |
| `tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts`, `projects/project-task-boundaries.e2e.test.ts` (exact lists, ungated) | Exact tool lists | tool exposure | Still Valid | — | whole E2E |
| `autobyteus-web/components/settings/nodes/__tests__/NodeRow.spec.ts` | Label for a sandbox peer | AC-015 | Still Valid; web unchanged since IMP-05 | `git diff ce0e69d8d7 d624f09ce6 -- autobyteus-web` empty | Reused IMP-05 |
| `autobyteus-ts/tests/unit/llm/*` | Endpoint option per provider | BEH-004 | Still Valid; autobyteus-ts unchanged since IMP-07 | as above | Reused IMP-07 |
| `autobyteus-web/electron/**/__tests__` | Release version in the server env | REQ-009 | Still Valid; unchanged since IMP-06 | as above | Reused IMP-06 |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | all | server typecheck | Reused | IMP-14 (`d624f09ce6`) | Ran on the commit under test |
| API-R02 | all | web typecheck (compiles server src) | Existing Test | `pnpm -C autobyteus-web typecheck` | Server src changed since IMP-02 |
| API-R03 | all, REQ-016 | whole server unit suite | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | TESTING tool-unit rule; IMP-03 ran before the fixes |
| API-R04 | AC-001..007, QR-004 | whole server integration | Existing Test | `pnpm -C autobyteus-server-ts test:integration:prepare`, then `test:integration` | TESTING tool-unit rule |
| API-R05 | AC-002, REQ-002, REQ-016 | whole server E2E | Existing Test | `env -i PATH HOME=<temp> TMPDIR pnpm test:e2e` | TESTING tool-unit rule |
| API-R06 | REQ-016 | gated exact tool lists | Existing Test | `RUN_CODEX_E2E=1 … codex-agent-tools-empty-list`; `SEARCH_MEMORY_LIVE_E2E=agy … search-memory-default-tool-live` | TESTING tool-unit rule |
| API-R07 | QR-004 | relayed body limit through the real gate | Durable | New case in `provider-relay-peer.integration.test.ts` | No body-size coverage exists |
| API-R08 | BEH-004, AC-015, REQ-009 | autobyteus-ts LLM, web node specs, Electron | Reused | IMP-07, IMP-05, IMP-06 | Those packages are unchanged since those checks |
| API-R09 | build | Fresh-start desktop build | Existing Test | fresh `--no-local` clone; `pnpm install --frozen-lockfile`; desktop job build; verify steps | `autobyteus-web/generated/graphql.ts` is a build input |
| API-E01, API-E02 | AC-008, AC-011 | failure diagnostics found during execution | Temporary Probe | `evidence/API-E01-*`, `evidence/API-E02-*` | Cause of the two failures (Rule 9) |
| API-R10 | AC-016 (contract part) | skill vs tool contracts | Temporary Probe | Script that compares the tool names, fields and refusal codes in `SKILL.md` with the source | A one-off cross-repository check |
| API-L01 | AC-008, QR-001, AC-009, AC-001, AC-007, AC-006, AC-015 (role), AC-002 | live sandbox, every API-key runtime | Durable (gated) | `SBX-01` in new `tests/e2e/sandboxes/sandbox-live.e2e.test.ts` | Project pattern for gated Docker suites |
| API-L02 | AC-011 (scripted), AC-015 (delegation with file), AC-010, QR-003 | delegation into the sandbox, folders, transcript, leak scan | Durable (gated) | `SBX-03` | same |
| API-L03 | AC-012, AC-011 (destroy) | caller rule, live; destroy leaves nothing | Durable (gated) | `SBX-04` | same |
| API-L04 | AC-003 live | host unpairs, sandbox run refused | Durable (gated) | `SBX-05` | SCN-A2 |
| API-L05 | AC-013 | expiry | Durable (gated) | `SBX-06` | same |
| API-L06 | AC-013, R-A | host crash restart, list lost | Durable (gated) | `SBX-07` | SCN-A3 |
| API-L07 | AC-014, R-B | limit with parallel creates; remote collaboration off; a home shared folder | Durable (gated) | `SBX-08` | SCN-A1 |
| API-L08 | QR-002 | relay latency | Durable (gated) | `SBX-02`: native haiku time to first streamed content, host direct vs. sandbox, alternating, 5 each | — |
| API-L09 | AC-001, AC-002, SCN-005, persisted `role` | owner-managed relayed node, outside Docker | Temporary Probe | Two built nodes paired by invite; B restarted with the C1 settings; native, Claude, Codex and Grok turns on B; B's vault empty | Owner path; overlaps the suite's helpers but needs no Docker |
| API-L10 | AC-016, AC-011 (planted link, REQ-015) | a real-model evaluator with only the tools and the skill | Journey (Temporary Probe) | Host + skill source + evaluator on Claude (vault); the package is planted with a link to a host canary file; inspect its transcript | A model's behavior is not a deterministic regression test |
| API-L11 | AC-015 rendered | Nodes page | Temporary Probe (browser) | Host with a live sandbox; `nuxt dev` against it; headless Chrome; assert `node-sandbox-label-*` | Ticket-specific journey |
| API-L12 | AC-005 live | Claude and Grok login tokens | Journey | `probes/sandbox-live-smoke.mjs --login-tokens --runtimes=claude_agent_sdk,grok_build` | Waits for DEC-118 |

- Test progress log needed: Yes.

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-R07 | `autobyteus-server-ts/tests/integration/credential-proxy/provider-relay-peer.integration.test.ts` (new case) | QR-004 has no coverage; the limit sits on both sides (peer forwarder and relay route) |
| API-L01..L08 | `autobyteus-server-ts/tests/e2e/sandboxes/sandbox-live.e2e.test.ts` (new, gated `RUN_SANDBOX_LIVE_E2E=1`; cases SBX-01..SBX-08) | Sandboxes have only fake-Docker unit tests; the journey is the Task's "done when" and future releases need a rerunnable check |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework: Electron with an embedded server.
- Guideline: TESTING.md (Isolated desktop instance; browser probes).
- Web-equivalent behavior: the Nodes page label. Proven by a browser probe on `nuxt dev` against a built host node with a sandbox peer.
- Shell-specific behavior: `AUTOBYTEUS_RELEASE_VERSION` reaches the embedded server. Reused IMP-06 (Electron spec).
- An isolated desktop instance cannot create a sandbox: its embedded server gets only a baseline environment, so no `AUTOBYTEUS_SANDBOX_IMAGE`, and no published image matches a worktree build.
- The run never touches the user's running app.

## Live Environment And Fixture Plan

- Order: image build; host via `startBuiltTestServer` (own root, own DB, vault, scripted AGY); then the cases.
- Readiness: `Server listening`; the sandbox's C6 `ready`.
- Evidence: per-case JSON summaries (value-free), C5 summaries, timings, `docker ps` after each case, and the browser DOM and screenshot.
- Cleanup: destroy or failsafe `docker rm -f -v` by label; `removeOwnedTestRuntime`; temp folders; image removal at the end.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-005 live (Claude, Grok login tokens) | Claude setup-token missing from the vault; the user's Grok login expired; DEC-102 forbids renewing | Login-token mode fails live (off by default) | Yes, until the user provides them | DEC-118: run API-L12 when the Solution Designer says the user is ready; else delivery takes it to the user |
| AC-014 "Docker stopped" and "unsupported platform" live | Stopping the user's Docker Desktop is not allowed; no other OS here | Low (unit-tested with a fake Docker and platform) | No | Covered by unit tests; FU-581-02 |
| Linux/Windows hosts | DEC-105 | — | No | FU-581-02 |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Round 2 Rerun Plan (by impact)

- Validated commit: round 1 `d624f09ce6`. Round 2 code: `7296a698d6`.
- `git diff --name-only 0edd500997 7296a698d6` (source): `sandbox-pairing.ts`, `sandbox-manager.ts`, `sandbox-folders.ts`, `sandboxes.md`, `tests/unit/sandboxes/sandbox-{manager,pairing}.test.ts`.
- No shared foundation changed (no lockfile, schema, autobyteus-ts, contracts, harness, build input).
- **Rerun:**
  - API-R01: server typecheck; src changed.
  - API-R03b: `tests/unit/sandboxes` and `tests/architecture`, which read source by path.
  - API-L01..L08: the whole gated suite, twice, on a new image `autobyteus-server:581-api-e2e-r2` from `7296a698d6` with the host `dist` rebuilt. Twice because F-1 was intermittent.
  - API-L10: waited on F-2.
  - API-L11: exercises create.
  - API-R10: the skill against the new run-memory layout.
- **Still valid, with the reason:**
  - API-R02: no web cross-package test imports `src/sandboxes`.
  - API-R04: no integration test exercises `src/sandboxes`.
  - API-R05: no ungated E2E creates a sandbox, and the start sweep is unchanged.
  - API-R06: tool lists unchanged.
  - API-R07: its files are unchanged.
  - API-R09: no build input changed.
  - API-L09: no sandbox involved.
- API-E01 and API-E02 are superseded by the suite's own checks: repeated creates (F-1), and transcripts under `agents/<runId>/`, kept after destroy (F-2; SBX-04 gained `transcriptsKept`).
- API-L12 still waits for the user (DEC-118).

## Investigation Decision

- Proceed To API/E2E Execution: Yes
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: Yes (API-R07; the gated sandbox suite)
- Reroute Required Before Validation Execution: No
- Notes: DEC-118 received (AC-005 live waits for the user).
