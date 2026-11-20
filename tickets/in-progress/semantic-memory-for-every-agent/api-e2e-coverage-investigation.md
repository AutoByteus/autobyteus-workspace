# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-008, Approved; UI approved by the founder 2026-11-20)
- Investigation Notes: `investigation-notes.md`, `global-semantic-memory-investigation.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-008)
- Supplemental Task Artifacts: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/semantic-memory-view-554/ui-ux-spec.md` (Approved; VIS-001…VIS-019); `follow-ups.md` (FU-001…FU-003)
- Design Review Report: `design-review-report.md` (ARCH-REV-004, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (after the first result)
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: CRR-002 Pass (Large / High), message from `/code_reviewer`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1
- Code validated: branch `codex/semantic-memory-for-every-agent`, code at `cd26f4d913` (HEAD `2e5f786091` adds records); server source unchanged since `56b02294d0` (later commits touch only `autobyteus-web`)

## Current Requirement And Design Basis

Every agent, in every runtime and run kind, gets its semantic folder and the node's global folder `<memory>/semantic-global/` (created at run start) and the two prompt sections (DEC-013 text); Claude and Codex get both folders as extra roots (REQ-001, REQ-010, REQ-011). The switch is a clean cut; stored keys are ignored and dropped at the next write (REQ-002, REQ-003). The Memory page is organised by owner (Global · Agents · Agent Teams · Agent Orgs, agent/team/org pages) with a read-only semantic folder view whose read-only state is enforced by the node: writes refused, links listed and never entered, the view's workspace never listed and never a run's workspace (REQ-004…REQ-008, REQ-012). AC-012: owner queries without whole-node discovery, imported source ≤ 3 s.

## Supported Scenarios And Real Usage

- Designer journeys covered: UXJ-001…UXJ-005 (UI/UX spec), AC-001…AC-012.
- Real-use scenarios added, each with its real trigger:
  - **S-1 a client names a workspace by id**: `createAgentRun` accepts `workspaceId` and falls back to it when `workspaceRootPath` is blank (`agent-run-provisioning-service.ts` `resolveWorkspaceRootPath`). A client that sends the id of an opened semantic folder view must not get a run in it (REQ-007, AC-011). Temporary API probe; durable only if it shows a gap.
  - **S-2 the user leaves the Semantic tab while it loads** (CR-001): rendered check SMV-090/091 in the durable probe.
  - **S-3 two agents share facts through the global folder on real runtimes** (SML-GLOBAL, live, gated): Codex, Claude and native AutoByteus.
  - **S-4 the founder's imported source shows 0 team and org cards**: is that this change or the base? Compare base and branch on an APFS clone, read only, no server start.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001, BEH-005: prompt sections, folders, runtime access | Changed / Added | REQ-001, REQ-010, REQ-011 | units per runtime (reused); scripted-AGY e2e SM-*; live SML on real runtimes |
| BEH-002/003: switch removed, stored keys tolerated | Removed / Changed | REQ-002, REQ-003 | AC-002 grep; e2e SM-01/02 |
| BEH-004: owner Browse, read-only folder view | Added | REQ-005…REQ-008, REQ-012 | GraphQL e2e; rendered probe (+ CR-001); node refusals (probe + e2e SM-11 + S-1) |
| Workspace manager, file explorer, watcher | Changed | REQ-007 | units (reused); whole server suites |
| Episodic catalog read API, process binding | Added | REQ-006, AC-012 | units; AC-012 (reused); S-4 comparison |
| Web build inputs (`package.json`, `generated/graphql.ts`) | Changed | TESTING.md § Fresh-start build | fresh-start desktop build |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | semantic memory, workspaces, explorer, owners | server units | — | whole suites |
| API / transport / contract | Yes | GraphQL clean cut, file-explorer mutations, REST content route | API units, e2e | `workspaceId` path of `createAgentRun` | S-1 probe |
| Frontend component / state | Yes | Memory page, file explorer read-only mode, workspace store | web units | — | rendered probe |
| Browser integration / user journey | Yes | Memory page | rendered probe (IMP-13/16) | CR-001 rendered | SMV-090/091 |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | same as browser | probe | — | — |
| Desktop shell / Electron-specific integration | No (packaging only) | build inputs | — | packaged app | fresh-start build |
| Process / lifecycle | Yes | catalog binding in both roots | units, e2e | — | whole E2E |
| Persisted-data transition | Yes | `Directly Usable — No Migration` | units, e2e SM-01/02 | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Claude `--add-dir`, Codex `writable_roots` | units (wire shapes) | real CLI sandbox behaviour | live SML |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent`
- Stack: pnpm monorepo; server (Node 22, Vitest), web (Nuxt, Vitest, Playwright probe)
- Testing guideline: `TESTING.md` at the worktree root (no closer `TESTING*.md`)
- Conflicts: none. AC-012 and S-4 read the founder's memory only through an APFS clone and run no server start (TESTING.md data rule).
- Changed build-input paths: `autobyteus-web/package.json`, `autobyteus-web/generated/graphql.ts` → fresh-start case API-11
- Secrets: test vault (OpenAI and Anthropic keys `CONFIGURED`); Codex and Claude live suites use the host logins as the test header says (`RUN_CODEX_E2E`: throwaway `CODEX_HOME` with a link to `auth.json`; `RUN_CLAUDE_E2E`: real `HOME`, `USER`, `LOGNAME`)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` rerun by impact | reuse | server source unchanged since `56b02294d0`; web changes after it are covered by IMP-11b/14/15/16 |
| `TESTING.md` § Fresh-start build | build inputs | fresh clone, frozen install, desktop job build and verify steps |
| `TESTING.md` § Gates, Test vault, CLI settings | live | one runtime at a time; throwaway `CODEX_HOME`; never edit the user's CLI config |
| `agent-semantic-memory-live.e2e.test.ts` header | live gates | `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`, `RUN_AUTOBYTEUS_SEMANTIC_MEMORY_E2E` + vault; data root `SEMANTIC_MEMORY_LIVE_E2E_ROOT` (default `$HOME/.autobyteus-e2e`, outside /tmp) |
| `semantic-memory-view-probe.mjs` header | rendered probe | `pnpm -C autobyteus-server-ts build` first; `--output-dir` |
| `evidence/ac012-measure.mjs` | measurement on a clone | reads `dist/` services over a memory folder, no server |

## Persisted Data Transition Coverage Basis

- Approved decision: stored `semanticMemoryEnabled` `Directly Usable — No Migration`; `semantic-global/` created empty at the first run start
- Evidence planned: reuse unit + e2e SM-01/SM-02 (definition and personal settings both ways); whole suites
- Upstream ambiguity: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| server units (new/changed: semantic memory, workspaces, explorer, API access, prompts, owners) | AC-001…AC-011 units | all | Still Valid | IMP-04 (`a9ca3c48c6`; server source unchanged since) | Reuse; full unit suite reruns (IMP-01 ran before the last test fixes) |
| `tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` (SM-01…11, AGY-gated) | every run kind, stored keys, folder view refusals | AC-001, AC-003, AC-009, AC-011 | Still Valid | IMP-05/06 (tree of `56b02294d0`) | Rerun (core proof; cheap) |
| `tests/e2e/memory/memory-explorer-graphql.e2e.test.ts` | owner queries | REQ-006 | Still Valid | IMP-05 | Rerun in the whole suite |
| `internal-agents.e2e.test.ts` (AGY-gated) | hidden internal agents | AC-008 | Still Valid | IMP-08 | Rerun (gated) |
| startup upgrade e2e (`task-agent-own-run-startup`, `open-task-tree-upgrade-startup`) | read `listAgentEpisodes` | REQ-006 | Still Valid | IMP-07 | Rerun in the whole suite |
| `tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts` (live) | SML-WRITE/READ/GLOBAL, wire roots | AC-001, AC-009 | Unclear (not run) | — | Run (Codex, Claude, native) |
| web units | Memory page, explorer, stores | AC-004…AC-010 | Still Valid | IMP-11 (full, `56b02294d0`), IMP-11b/14/15 (later changes) | Reuse |
| `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs` | rendered UXJ checks, node refusals | AC-004…AC-011 | Needs Update (CR-001 rendered check) | IMP-13/16 | Add SMV-090/091, run |
| whole server integration, whole server E2E | preserved behavior | all | Unclear (not run) | — | Run |
| folder-watcher unit files | load-sensitive (FU-003 of autobyteus-493) | — | Still Valid | IMP-02 | Rerun |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | build | — | `pnpm -C autobyteus-server-ts build` | probe and e2e use `dist/` |
| API-01 | AC-002 | grep | Durable (command) | rerun IMP-12's grep on HEAD | cheap, direct |
| API-02 | AC-002 (types) | typechecks | Reused | IMP-10 (server), IMP-15 (web) | server source unchanged; web at `cd26f4d913` |
| API-03 | all (units) | server unit suite | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | IMP-01 predates the last test fixes |
| API-04 | AC-004…AC-010 (web) | web units | Reused | IMP-11 + IMP-11b + IMP-14 + IMP-15 | by impact |
| API-05 | AC-001, AC-003, AC-009, AC-011, AC-008 | scripted-AGY e2e | Existing Test (gated) | `RUN_AGY_FAILURE_E2E=1 … vitest run agent-semantic-memory.e2e internal-agents.e2e memory-explorer-graphql.e2e` | the core server proof, rerun directly |
| API-06 | AC-011 (S-1) | `createAgentRun` with a semantic `workspaceId` | Temporary Probe | GraphQL against a test server | the boundary the handoff left open |
| API-07 | AC-004…AC-011, REQ-007 (CR-001) | rendered probe | Durable | `node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir <fresh>` with SMV-090/091 | CR-001 rendered |
| API-08 | AC-001, AC-009 (real runtimes) | live SML | Existing Test (gated, paid) | Codex, Claude, native AutoByteus, each alone | the access roots only a real CLI proves |
| API-09 | all | server integration | Existing Test | `test:integration:prepare`, `test:integration` | not run |
| API-10 | all | whole server E2E | Existing Test | `env -i … pnpm test:e2e`; failures alone and on base | not run |
| API-11 | build inputs | fresh-start desktop build | Fresh-start proof | fresh clone → frozen install → `build:electron:mac --arm64` → verify steps | TESTING.md |
| API-12 | AC-012 / S-4 | imported team and org cards, base vs branch | Temporary Probe (read only, clone, no server) | the same listing on both builds over an APFS clone | the code reviewer's residual risk |
| API-13 | — | folder-watcher units | Existing Test | `vitest run` the watcher files | FU-003 recheck |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-07 | `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs` (SMV-090/091) | CR-001 is a timing path the specs cover with a fake; the probe covers it through the real page and store |

## Durable Coverage To Update

None besides the probe above.

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Grok, DeepSeek harness and Antigravity live | each needs its own host login and paid inference; their prompt and access paths are the shared carpenter composer and the ACP/AGY owners, unit-tested per runtime, and AGY's capsule prompt is proven in SM-* | low | No | — |
| Signing, the Docker image, other operating systems | need the release runner | low | No | release run |
| The founder's node | no server start on his data (TESTING.md) | — | Yes | delivery |

## Ambiguities Or Reroute Triggers

None before execution.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (probe SMV-090/091)
- Reroute Required Before Validation Execution: `No`
