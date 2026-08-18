# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/autobyteus-runtime-reproduction-evidence.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`.
- Current Investigation Round: 1
- Trigger: `CRR-003` Pass at implementation commit `294e73390a16643d327695bfa4df06e30da84138`; mandatory API/E2E coverage investigation, stale-contract maintenance, and execution.
- Prior Investigation Reviewed: None; no prior API/E2E coverage investigation or result exists.
- Latest Authoritative Investigation: This file, updated after repository and live execution on 2026-08-17. The initial pre-edit decisions remain preserved above; the completed execution/result sections are authoritative over earlier plan wording.

## Current Requirement And Design Basis

The reviewed implementation must prove one truthful continuation contract across three runtimes. A configured Codex member must durably bind and resume the exact provider thread; a configured Claude member must reserve, durably bind, create, and later resume one valid UUID; a configured native AutoByteus member must restore the same local AgentRun working-context snapshot and requested workspace without entering the external binding lifecycle. Visible local history is independent evidence and must not mask a context-free replacement. Fresh executions remain fresh only when canonical activity/binding state permits it. Known provider restore failure, external prior activity with a null binding, unreadable activity, corrupt native restoration, provider-ID conflict, or cleanup uncertainty must fail closed rather than create a replacement.

The governing concurrency/durability invariant is construction before publication but durability before input: one handle-owned readiness/materialization promise and one manager-owned private candidate are shared or exclusively claimed; root/task/standalone identity durability completes before synchronous publication. Configured descendants inherit restored provenance; newly delegated tasks are always fresh. Existing current-schema tree, workspace, native memory, trace, and valid external identity data are directly usable with no migration.

Critical acceptance-criteria groups are: Codex physical and semantic full-restart continuity (`AC-001`–`AC-004`); external binding, fresh/failure, and standalone Codex safeguards (`AC-005`–`AC-009`); Claude UUID lifecycle and configured/standalone continuity (`AC-010`–`AC-015`); native browser restart, physical binding/snapshot/workspace evidence, provenance, and concurrency (`AC-016`–`AC-019`).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001`, configured Codex provider identity | Changed | Requirements, Codex reproduction, DS-001/DS-002, CRR-003 | Prove exact root binding before publication and identical thread after process restart. |
| `BEH-002`, local history versus runtime context | Preserved and strengthened | All three reproductions; REQ-007/REQ-015 | Assert message order/uniqueness separately from provider/native semantic context. |
| `BEH-003`, team binding category | Changed | `CODE-FIND-001` resolution; REQ-003/REQ-009/REQ-013 | Prove configured/task external adoption and configured/task native binding-null, including legacy native self-ID direct use. |
| `BEH-004`, standalone Codex | Preserved | REQ-008; DS-006 | Re-run exact-ID restore and no-replacement tests. |
| `BEH-005`, genuinely fresh activation | Preserved with durability gate | REQ-004; DS-001/DS-003/DS-010 | Replace eager-manager tests with private candidate, post-durability publication, and same-process reuse assertions. |
| `BEH-006`, known resume/null-binding failure | Changed | REQ-005/REQ-006; removed Codex fallback | Prove no `thread/start`, one observable team error, and no candidate replacement. |
| `BEH-007`, configured Claude UUID | Changed | Claude reproduction and SDK contract; REQ-010 | Prove reserved UUID, mutually exclusive first `sessionId` and later `resume`, exact stream confirmation, root durability, and restart. |
| `BEH-008`, standalone Claude durability | Changed | REQ-011; ARCH-REV-002 | Prove metadata durability before publication/input and abrupt-process exact resume. |
| `BEH-009`, configured native restore | Changed | Native reproduction/control; REQ-012/REQ-015 | Prove restored provenance, activity-selected generic restore, same IDs/memory, snapshot append, and no restore-to-create fallback. |
| `BEH-010`, persisted workspace activation | Changed | Native reproduction/control; REQ-014 | Prove `ensureWorkspaceByRootPath` precedes activity/backend work and live restart has no valid-root temp fallback. |
| Configured-subteam overlap | Changed in `IR-003` | `CODE-FIND-002`, `AC-019`, CRR-003 | Preserve direct and production-boundary latch coverage: one child wrapper, one candidate/publication, two admitted messages. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Candidate claim/publication/abort; activation planning; identity adoption; persistence coordination | Changed focused unit/integration tests plus stale unit files | Several central tests still assert removed APIs and currently cannot protect the new contract | Durable unit/integration repair plus broader suite |
| API / transport / contract | Yes | GraphQL restore and WebSocket first post-restart message reach lazy configured activation | Existing same-process runtime E2E tests | No existing durable test performs a full API-process restart for this TeamRun contract | Real backend + real web/browser process-restart journeys |
| Frontend component / state | No source change | Existing conversation UI only | Existing frontend behavior and prior screenshots | Reopen/message visibility must be observed, but no frontend code changed | Browser as an ingress/observation surface, not a layout review |
| Browser integration / user journey | Yes, validation-only | Reopen saved TeamRun after complete API stop/start and send recall | Prior base failures; no current-implementation browser evidence | Provider/native context may still differ from same-process repository mocks | Browser required |
| Authentication / session / permissions | No product auth change | Provider credentials/model access only | Project secret importer and isolated vault/database | Credential/provider availability can block a specific live runtime | Isolated credentials; explicit unavailable classification |
| Desktop renderer / web-equivalent UI | Yes, validation-only | Electron renderer-equivalent TeamRun page is served by Nuxt web dev path | Repository README documents web path | None shell-specific in changed source | Browser-preferred web development path |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, or shell lifecycle code changed | N/A | None material | No desktop execution |
| Process / lifecycle | Yes | Full server loss, root re-materialization, first post-restart input, abrupt standalone Claude loss | Unit/integration lifecycle tests; prior failing live evidence | Same persisted state in a new OS process is the core bug boundary | Lifecycle + browser/live API |
| Persisted-data transition | Yes | Direct read of V1 tree, external bindings, native local memory/snapshot, workspace root, standalone metadata | Schema/current-tree tests and native integration | Representative old native self-ID and physical snapshot append need explicit evidence | Durable fixture + live filesystem inspection |
| Worker / queue / distributed coordination | No | No worker/queue/multi-node state | N/A | N/A | None |
| External integration | Yes | Codex App Server and Claude Agent SDK exact restore; DeepSeek-backed native model | Provider-specific unit/integration tests; live env gates | Mocks cannot prove provider identity survives process restart | Live provider/browser execution |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix`
- Project type and runtime stack: pnpm monorepo; TypeScript/Node Fastify + GraphQL/WebSocket backend; Nuxt web frontend used by the Electron renderer; Vitest unit/integration/E2E; Prisma/SQLite; Codex App Server, Claude Agent SDK 0.3.231, and native AutoByteus runtime.
- Conflicting, missing, or unclear project instructions: Repository `pnpm typecheck` is known to fail before meaningful test typing because `tsconfig.json` combines `rootDir: src` with `include: [src, tests]`; production `tsconfig.build.json` is the valid production typing gate. Existing real-provider runner covers provider capabilities but not TeamRun process restart. No durable browser test framework exists for this journey, so browser restart execution will be retained as a temporary evidence package while lower-boundary contracts remain durable Vitest coverage.
- Required environment variables or secrets available: `Yes` for the user-approved isolated import source; values will not be printed or retained. Provider/model availability remains subject to live preflight.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/autobyteus-server-ts/AGENTS.md` | Closest test instruction | Use `pnpm ... exec vitest run ... --no-watch`; run narrow files first. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/autobyteus-server-ts/README.md` | Backend environment/build/test/live runtime authority | Build before run; backend supports `--data-dir`, host, and port; tests use isolated `tests/.tmp`; Codex live tests require `RUN_CODEX_E2E=1`; unavailable external capabilities are skipped/reported, never passed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/README.md` | Workspace development authority | `pnpm dev` is canonical fixed-port development path; deterministic `pnpm test:e2e`; real-provider preflight/execution; development state is separate. For this ticket's multiple restart journeys, the approved supplemental instructions authorize explicit disposable paths/ports rather than shared fixed development state. |
| `autobyteus-server-ts/package.json` | Server scripts | `pnpm run build`, production `tsc`, Vitest, and safe Codex history cleanup. |
| root `package.json` | Workspace scripts | `pnpm test:e2e`, `pnpm test:e2e:real:preflight`, `pnpm test:e2e:real`, and `pnpm secrets:import`. |
| `autobyteus-server-ts/vitest.config.ts` | Test runner isolation/order | Fork pool, file parallelism disabled, `.env.test`/Prisma global setup, all `tests/**/*.test.ts` except prompt-engineering exclusions. |
| `test-support/live-e2e/*` | Real-provider capability harness | Starts a built isolated test runtime and explicitly reports missing/unavailable scenarios; it does not cover TeamRun restart continuity. |
| Approved design/reproduction supplements | Ticket-specific realistic validation authority | Use `/Users/normy/autobyteus_org/autobyteus-agents`, Classroom Simulation Team, exact isolated secret import, disposable database/app-data/memory/log/temp paths, full API listener stop, same-state restart, physical tree/provider/snapshot/log evidence. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Repository checks | `autobyteus-server-ts` | `pnpm exec vitest run <paths> --no-watch`; `pnpm exec tsc -p tsconfig.build.json --noEmit`; `pnpm run build` | Existing workspace dependencies installed | Command exit/status | No process |
| Deterministic backend E2E | repository root | `pnpm test:e2e` | Test-owned temporary DB/runtime | Vitest result | Global setup/teardown |
| Real-provider preflight | repository root | Selected `pnpm test:e2e:real:preflight` and/or direct test-runtime preflight | Test runtime only; capability reporting is not TeamRun restart proof | Structured preflight result | Harness-owned stop |
| Isolated API | repository root/server | Build, then `node autobyteus-server-ts/dist/app.js --data-dir <owned-root> --host 127.0.0.1 --port <owned-port>` with explicitly pinned environment | Proposed `/private/tmp/codex-runtime-thread-resume-fix-api-e2e-20260817`; candidate API ports 60422+ after ownership/free-port checks | Exact HTTP/GraphQL endpoint and `lsof` listener | Signal only owned PID; verify listener closed; remove owned temp root after evidence copy |
| Isolated web frontend | `autobyteus-web` or project-supported launch command learned from prior reproduction | Nuxt dev on candidate port 31322+ with backend URL pointed to owned API | Web-equivalent Electron renderer; no desktop shell | Page load + semantic DOM | Stop only owned PID; close owned tabs |
| Codex App Server | Child of API/runtime | Product launch through TeamRun | `gpt-5.6-luna`; exact provider thread | Tree/provider records + response | Team/API termination; retain only redacted evidence |
| Claude Agent SDK | Child of API/runtime | Product launch through TeamRun/standalone | configured `haiku` entry resolving to requested provider selection; exact UUID | Tree/JSONL + response | Team/API termination; retain only redacted evidence |
| Native AutoByteus + DeepSeek | Child of API/runtime | Product launch through TeamRun | `deepseek-v4-flash`; requested workspace root | Snapshot/tree/log + response | Team/API termination; retained evidence then delete disposable runtime |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Provider credentials | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:///private/tmp/<owned-run>/autobyteus.db` | Never target or open production/default DB; do not record values | Delete owned DB and sibling vault key after redacted evidence copy |
| Team definition | Product import from `/Users/normy/autobyteus_org/autobyteus-agents`; select Classroom Simulation Team | User-approved local package | Disposable database/app-data only |
| Codex marker | New unique marker for this round | No client replay in recall prompt | Retain marker/response/tree/thread evidence |
| Claude marker | `AMBER-ORCHID-4821` or a new unique equivalent; exact UUID | No client replay; also exercise standalone abrupt restart if feasible | Retain marker/response/tree/UUID evidence |
| Native marker/state | New unique marker; same TeamRun/AgentRun/memory | Inspect snapshot for exactly-once pre-turn and appended recall; binding null | Retain redacted JSON/log/screenshot; delete owned state |
| Concurrency latches | Existing Vitest mocks/real mixed composition | Deterministic; no provider | Repository-resident durable tests |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md` “Persisted Data / State Transition Decision”; `implementation-handoff.md` “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: current V1 tree with exact local TeamRun/AgentRun IDs and runtime kind; valid external binding for Codex/Claude; native null binding and, separately, a legacy native self-ID fixture; non-null workspace root; existing native traces and working snapshot; standalone external metadata. External restores the exact opaque ID. Native ignores the external field, restores from local ID/memory when activity exists, keeps new mutations null, and appends rather than replaces the snapshot.
- Evidence executed: durable current-tree/legacy-native and runtime-kind tests; real process restart with physical trees before/after; native snapshot/tree/log inspection; standalone metadata and exact external identity inspection.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/agent-run-manager.test.ts` | Eager create/restore returns live run; registry/sidecars are immediately active | DS-010, AC-006/AC-009 | `Replace` | Production APIs are now private `prepare*` candidates plus explicit publication/abort; eager assertions protect removed behavior | Rewrite scenarios around claim-before-await, private registry invisibility, publication, strict restore, abort/retry/quarantine, sidecar rollback, and termination after publish. |
| `tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts` | Fresh local AgentRun ID placeholder and restored mutable session ID | REQ-009–REQ-011; AC-013–AC-015 | `Needs Update` | Placeholder is explicitly forbidden; lifecycle now reserves immutable UUID | Use deterministic valid UUID/lifecycle fixtures; assert fresh versus restored lifecycle state. |
| `tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` identity/resume scenarios | Stream UUID adoption/cache migration; first turn omits identity; later mutable resume | REQ-010/REQ-011; AC-013/AC-014 | `Replace` for identity block; other turn/tool/event tests `Still Valid` after fixture update | `adoptResolvedSessionId` and placeholder behavior were intentionally removed | Replace obsolete identity cases with first `create`, later/restored `resume`, query-open interruption resume, exact confirmation/conflict/unconfirmed failure; update common fixture only as needed. |
| `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` session option scenario | Optional ambiguous `sessionId` mapped to resume | REQ-010; AC-013 | `Needs Update` | Production input is discriminated `create` or `resume` binding | Assert SDK receives only `sessionId` on create and only `resume` on restore/later turn. |
| `tests/unit/agent-team-execution/team-run-persistence-coordinator.test.ts` | Caller supplies precomputed prepared tree/commit | DS-005, REQ-001/REQ-003 | `Needs Update` | Coordinator now prepares mutation at lock head to avoid lost updates | Update fixtures/calls to current lock-head callback contract; keep not-renamed/indeterminate/fail-stop assertions. |
| `tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts` | Valid start/resume routing, but a fixture uses pre-current member identity | REQ-005/REQ-008; AC-008/AC-009 | `Needs Update` | One `MemberTeamContext` shape is stale; no test asserts resume error avoids start | Update identity fixture and add strict resume failure/no `thread/start`. |
| Seven changed IR-002/IR-003 test files | Root mode, nested/task provenance, native plan/null binding, workspace order, real native restore, configured-child/agent overlap | REQ-012–REQ-015; AC-016–AC-019 | `Still Valid` | CRR-003 reviewed 33/33; assertions represent approved behavior | Re-run; retain. |
| `tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts` | Real native backend create/terminate/restore using same run/memory | REQ-012/REQ-015 | `Still Valid` | Direct native backend restore boundary | Run focused scenario/suite. |
| `tests/integration/runtime-execution/codex-app-server/thread/codex-thread-manager.integration.test.ts` | Real Codex exact thread continuation, environment-gated | REQ-005/REQ-008; AC-009 | `Still Valid` | Direct provider transport without TeamRun root/process restart | Run when Codex environment is available; does not replace configured browser restart. |
| Existing runtime E2E files for native/Codex/Claude/mixed/nested teams | Same-process create/terminate/restore, messaging, workspace/config projection | General runtime non-regression; part of AC-003/AC-005/AC-019 | `Still Valid` but insufficient alone | They exercise API/WebSocket/runtime boundaries but not full server-process loss | Run proportionate relevant E2E files or deterministic E2E suite; retain. |
| `test-support/live-e2e` + real provider capability E2E | Capability preflight/one-turn provider checks | Environment fidelity | `Still Valid` but out of direct continuity scope | Useful provider/credential readiness only | Use preflight selectively; never count skipped capability as pass. |
| Existing prior browser evidence artifacts | Demonstrate base defects, not fixed behavior | AC-001–AC-004, AC-010–AC-012, AC-016–AC-018 | `Still Valid` as reproduction baseline, not current pass evidence | Recorded against base/personal comparison commits | Do not reuse as current implementation result; create new current-commit evidence. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `agent-run-manager.test.ts` eager create/restore blocks | Manager returns and registers a live run immediately | Violates durability-before-publication and candidate privacy | SR-003, ARCH-REV-002, implementation handoff | Candidate prepare/invisibility/publish/abort/quarantine tests in same file | N/A |
| `claude-session-manager.test.ts` fresh placeholder | Fresh runtime context starts with local run ID as provider session | REQ-009/REQ-010 forbids local IDs/placeholders | Claude investigation, SR-002/SR-003 | Reserved UUID lifecycle fixture and exact state assertions | N/A |
| `claude-session.test.ts` adoption/cache-migration and no-ID first query | Provider stream may rebind identity after input | Identity must be immutable and durable before admission | REQ-010/REQ-011, AC-013/AC-014 | Create/resume discriminant and confirmation/conflict tests | N/A |
| `claude-sdk-client.test.ts` ambiguous optional session input | One nullable field means SDK resume | SDK has separate `sessionId` create and `resume` restore | Installed SDK contract in Claude evidence | Mutually exclusive SDK option assertions | N/A |
| `team-run-persistence-coordinator.test.ts` precomputed next-tree input | Mutation can be prepared before acquiring root lock | Permits stale-head/lost-update behavior | DS-005 and reviewed lock-head design | Current callback-at-lock-head contract assertions | N/A |
| `codex-thread-manager.test.ts` old member identity fixture | Old context shape supplies team identity | Current compound identity/context is authoritative | Implementation handoff stale-test disclosure | Current `MemberTeamContext` fixture | N/A |

No entire file is approved for deletion. Obsolete scenarios will be replaced in place so the files continue covering their owning boundary; compatibility-only assertions will not be retained.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned / Realized Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `DUR-CAND-001` | Private candidate claim, invisibility, publication, abort/retry, quarantine | REQ-004/REQ-011; AC-006/AC-015; DS-010 | Rewrite/expand `tests/unit/agent-execution/agent-run-manager.test.ts` | Core admission invariant currently lacks valid durable tests. |
| `DUR-BIND-001` | Recursive configured/nested/task binding adoption, idempotency, compound miss/duplicate/conflict; native excluded at adaptation tests | REQ-001/REQ-003/REQ-009/REQ-013; AC-004/AC-005/AC-010/AC-017 | New `tests/unit/agent-team-execution/team-run-execution-tree-mutator.test.ts` | Root binding is the authoritative persisted identity boundary. |
| `DUR-ACT-001` | Active + complete archived traces; malformed active/manifest/complete segment is read-only `indeterminate` | REQ-006/REQ-012/REQ-015 | New `tests/unit/agent-memory/agent-conversation-activity-inspector.test.ts` | Fresh versus fail-closed/restore selection depends on this fact. |
| `DUR-STAND-001` | Standalone activation one-flight, metadata-before-publication, exact/unchanged/indeterminate reconciliation, cleanup quarantine | REQ-008/REQ-011; AC-009/AC-015; DS-006/DS-009/DS-011 | New `tests/unit/agent-execution/standalone-agent-run-activation-service.test.ts` | Standalone Claude abrupt safety and overlapping callers lack current durable coverage. |
| `DUR-CODEX-001` | Known resume failure never calls start; exact restored ID required | REQ-005/REQ-008; AC-008/AC-009 | Update Codex thread/manager tests | This is a critical explicit failure contract. |
| `DUR-CLAUDE-001` | Valid UUID reserved before first query, `sessionId` create versus `resume`, exact/conflict/unconfirmed stream identity | REQ-009–REQ-011; AC-010/AC-013–AC-015 | Update three Claude unit files | Critical provider identity lifecycle is otherwise protected by stale tests. |
| `DUR-TASK-001` | Direct external task binding staged in same next tree and candidate published only after task/tree durability; native stages none | REQ-003/REQ-013; AC-005 | Existing task-delegation unit test or a narrow new test after API inspection | Task candidate exists before its node and needs an atomic durability assertion. |
| `DUR-LEGACY-NATIVE-001` | Direct-use V1 native self-ID is ignored; new tree remains null | Directly Usable — No Migration; AC-017 | Existing factory/native activation test extension if current fixture is incomplete | Protects approved normal-reader policy without a compatibility rewrite. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `UPD-STALE-001` | `tests/unit/agent-execution/agent-run-manager.test.ts` | Replace all eager API uses with current candidate lifecycle and explicit publication | SR-003/DS-010 | Preserve valid sidecar/MCP teardown assertions after publication. |
| `UPD-STALE-002` | `tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts` | Replace placeholder fixture with required lifecycle/binding | REQ-009/REQ-010 | Preserve message history and termination tests. |
| `UPD-STALE-003` | `tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | Update common constructor/lifecycle and replace identity block | REQ-010/REQ-011 | Preserve unrelated tool/event/order tests. |
| `UPD-STALE-004` | `tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Pass discriminated binding and assert mutually exclusive SDK options | AC-013 | Preserve auth/settings/tool option tests. |
| `UPD-STALE-005` | `tests/unit/agent-team-execution/team-run-persistence-coordinator.test.ts` | Use lock-head preparation callback/current persistence outcome API | DS-005 | Preserve fail-stop semantics. |
| `UPD-STALE-006` | `tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts` | Update member identity fixture and add strict failure assertion | AC-008/AC-009 | No fallback assertion is mandatory. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| Obsolete individual assertions listed above | They enforce intentionally removed eager, placeholder, rebinding, ambiguous, or pre-lock behavior | Legacy Removal Policy; REQ-009–REQ-011; DS-005/DS-010 | Replace in the same owning test files. No entire durable artifact is removed. |

## Repository Coverage Execution Plan And Results

All commands ran in the assigned worktree at implementation commit `294e73390a16643d327695bfa4df06e30da84138`. API/E2E-owned changes were test-only; no production source was changed.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Six disclosed stale files, first before and then after maintenance: `pnpm exec vitest run tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts tests/unit/agent-team-execution/team-run-persistence-coordinator.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts --no-watch` | `autobyteus-server-ts` | Validates the disclosed assertions were stale and replaces them with candidate, immutable UUID, lock-head, and strict Codex resume contracts | `Pass` after maintenance: 6 files, 65/65; before: 19 passed/41 failed | `api-e2e-evidence/repository/stale-six-before.log`, `stale-six-after.log` |
| 2 | Three API/E2E-added unit files | `autobyteus-server-ts` | Activity fail-closed classification, root binding mutation, standalone activation/admission | `Pass`: 3 files, 18/18 | `api-e2e-evidence/repository/api-owned-new-tests-after.log` |
| 3 | Final 21-file focused unit/integration/E2E command | `autobyteus-server-ts`; no live provider flag | Candidate/durability, configured/nested/task provenance, native restore/null binding/workspace, provider identity/failure, concurrency, WebSocket command boundary | `Pass`: 21 files, 139 passed, 1 provider-live skip | `api-e2e-evidence/repository/focused-cumulative-final.log` |
| 4 | `pnpm exec tsc -p tsconfig.build.json --noEmit`; `pnpm run build` | `autobyteus-server-ts` | Production typing, build, shared packages, Prisma generation, sanitized bootstrap smoke | `Pass` | `api-e2e-evidence/repository/build-and-static.log` |
| 5 | `pnpm test:e2e:real:preflight` | root; harness-owned empty isolated vault | Provider capability contract and value-safe preflight behavior | `Pass`: build plus 18/18 capability-contract tests. Managed remote secrets correctly appeared absent in that empty harness; the later live run used the separately isolated approved import. | `api-e2e-evidence/real-provider-preflight.log` |
| 6 | `pnpm exec vitest run tests/unit tests/integration --no-watch` | `autobyteus-server-ts`; deterministic test DB | Broad regression inventory | `Non-clean / classified`: 79 failed files, 408 passed, 17 skipped; 221 failed, 2510 passed, 61 skipped. The exact same current-state counts were reproduced after focused maintenance. Failures are widespread stale fixtures/removed APIs and unrelated application/config contracts, including adjacent old eager-manager/WebSocket/Claude-constructor fixtures. The maintained 21-file replacement set is green. | `api-e2e-evidence/repository/broad-unit-integration-final.log` |
| 7 | Initial and final `pnpm test:e2e` | root; deterministic test-owned DB | Whole deterministic E2E suite plus updated correlated command and Claude WebSocket boundaries | `Non-clean / classified`; improved from 7 failed files/9 tests to 5 failed files/5 tests, with 45 files and 169 tests passing and 51 skipped. Both directly related files now pass. Remaining failures are pre-existing stale imports/GraphQL fixtures in agent-package, media, token-usage migration, and workspace-history areas. | `api-e2e-evidence/repository/deterministic-e2e.log`, `deterministic-e2e-final.log`, `agent-command-status-e2e-after.log`, `claude-websocket-e2e-after.log` |
| 8 | `git diff --check` | root | Patch whitespace and conflict-marker integrity | `Pass` | `api-e2e-evidence/repository/final-diff-check.log` |

Broad-suite classification is intentionally not reported as a green repository baseline. It is an existing durable-suite debt signal, not evidence of a ticket implementation regression: the failures enforce removed method/constructor/GraphQL contracts or occur in unrelated application/media/history/migration surfaces; the current reviewed boundary passes focused production-boundary tests and six real restart journeys. No broad failure reproduced a provider-identity replacement, native context loss, wrong workspace, duplicate publication, or command rejection in the current product path.

## Post-Repository Confidence Scorecard

| Confidence Category | Score | Repository Evidence | Residual Gap Before Broader Validation |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 91% | 21 focused files, 139 pass/1 live skip; all deterministic lower contracts represented | No real full-process semantic/provider continuity yet |
| Changed-boundary execution directness | 92% | Production managers/services, persistence/mutator, real WebSocket handlers, and native backend integration exercised | External provider continuation still mocked or environment-gated |
| Cross-boundary integration realism and mock gap | 87% | Narrow integration/E2E boundaries pass | No current-commit API-process loss against real Codex/Claude/DeepSeek |
| Environment, configuration, identity, and fixture fidelity | 85% | Production build and isolated Prisma/preflight paths pass | Real secret import, package import, exact models, and physical files not yet exercised |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | Null binding, known resume failure, conflict/unconfirmed UUID, abort/quarantine, overlap, termination covered | Actual process death/reopen remains unproven |
| User-surface, browser, and desktop-shell confidence | 75% | Deterministic WebSocket E2E only; browser not yet run | Core reported web-equivalent restart journey absent |
| Durable regression coverage quality and relevance | 92% | Six disclosed stale files repaired; 15 current durable paths added/updated; focused set green | Repository-wide unit/integration and deterministic E2E baselines remain red from classified stale debt |

- Overall post-repository confidence: **87.7%** (`614 / 7`, simple average).
- Every critical acceptance criterion directly proven: `No` at the repository-only stage; the real process/provider/browser portions of `AC-001`–`AC-004`, `AC-010`–`AC-012`, and `AC-016`–`AC-018` still required live execution.
- Any applicable category below `90%`: `Yes` — integration realism, environment/fixture fidelity, and browser/user surface.
- Default clean-confidence target of `95%` met: `No` at this stage.
- Material residual risks: exact external provider identity and native working snapshot could still be replaced only after OS-process loss; repository-wide stale durable debt prevents using the broad suite as a clean regression signal.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Browser` + `Lifecycle` + physical filesystem/provider evidence.
- Specific confidence gap addressed: the changed contract crosses the web client, GraphQL/WebSocket command ingress, persisted tree/metadata, a complete API process boundary, external providers or native working memory, and workspace reconstruction.
- Material execution-plan expansion: the user explicitly required the three runtimes not only for Classroom Simulation Team but also for the individual Daily Assistant. The live matrix was expanded to six journeys: configured team and standalone agent for Codex, Claude, and native AutoByteus.
- Browser-specific rationale: the renderer journey is web-equivalent and no Electron shell code changed; the real Nuxt browser path is the preferred direct surface.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron with a web-equivalent Nuxt renderer.
- Chosen validation approach: real isolated backend and real Nuxt UI in a browser; full API stop/start against the same persisted state.
- Shell-specific behavior: no preload, IPC, window, packaging, or Electron lifecycle code changed; actual desktop launch was unnecessary.
- Effect on the user's running desktop application: None. Owned ports and an isolated database/data root were used; production/default data was neither targeted nor opened.

## Live Environment And Fixture Execution

- Owned isolated root: `/private/tmp/codex-runtime-thread-resume-fix-api-e2e-20260817` (removed after evidence copy).
- Owned API/web endpoints: `127.0.0.1:60422` and `127.0.0.1:31322`.
- Database/data root: isolated SQLite database and server data under the owned root. Nine managed secrets were imported interactively using the exact approved source/target form; values were neither printed nor retained.
- Seed: product UI import of `/Users/normy/autobyteus_org/autobyteus-agents`; `Classroom Simulation Team` and `Daily Assistant` definitions.
- Models: Codex `gpt-5.6-luna`; Claude `haiku`; native AutoByteus `deepseek-v4-flash`.
- Restart boundary: all six pre-restart turns completed, the API listener/process was fully stopped and verified closed, then a new API process opened the same isolated state. The browser reopened each saved run and sent the first context-dependent post-restart turn.
- Authoritative compact evidence: `api-e2e-evidence/live-browser/live-scenario-matrix.txt`, `identity-continuity.txt`, `restart-boundary.txt`, `database-isolation.txt`, `native-marker-occurrence-audit.txt`, `native-restore-log-audit.txt`, and scenario screenshots/API state/provider traces/physical files.

| Scenario ID | Subject / Runtime | Marker | Required Continuity | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| `LIVE-TEAM-CODEX-001` | Classroom Simulation Team / Professor / Codex | `CODEX-FIX-817-C9X4` | Same TeamRun, AgentRun, non-null thread `01a01143-b378-70a2-ab71-96799f7281fb`; ordered history; exact first recall | `Pass` | `codex-*-restart-state.json`, `codex-*-restart.png`, `codex-team_run_execution_tree.json`, `codex-team-provider-session.jsonl` |
| `LIVE-TEAM-CLAUDE-001` | Classroom Simulation Team / Professor / Claude | `CLAUDE-FIX-817-H7Q2` | Same TeamRun, AgentRun, UUID `0f1e5275-277e-4fcf-9572-c560e66aea25`; ordered history; exact first recall | `Pass` | `claude-*-restart-state.json`, `claude-*-restart.png`, `claude-team_run_execution_tree.json`, `claude-team-provider-session.jsonl` |
| `LIVE-TEAM-NATIVE-001` | Classroom Simulation Team / Professor / AutoByteus | `NATIVE-FIX-817-N4M8` | Same TeamRun/AgentRun, null external binding, prior snapshot restored/appended in order, requested workspace re-established, exact recall | `Pass` | `autobyteus-*-restart-state.json`, `autobyteus-*-restart.png`, tree, snapshot, raw trace, restore audit |
| `LIVE-DAILY-CODEX-001` | Daily Assistant / Codex | `DAILY-CODEX-817-D3K6` | Same standalone run and non-null thread `01a01145-b9ed-7912-adf0-34f9d11e28ba`; exact recall | `Pass` | `daily-codex-*-restart-state.json`, screenshots, metadata, provider session |
| `LIVE-DAILY-CLAUDE-001` | Daily Assistant / Claude | `DAILY-CLAUDE-817-D8V5` | Same standalone run and UUID `0ecffbd0-a6db-4fbf-8a2f-c66b29f578cc`; exact recall after abrupt process loss | `Pass` | `daily-claude-*-restart-state.json`, screenshots, metadata, provider session |
| `LIVE-DAILY-NATIVE-001` | Daily Assistant / AutoByteus | `DAILY-NATIVE-817-D2P9` | Same standalone run, null external binding, restored/appended native working snapshot, exact recall | `Pass` | `daily-autobyteus-*-restart-state.json`, screenshots, metadata, snapshot/raw trace |

The post-state API projections independently contain exactly four ordered visible message events (`user, assistant, user, assistant`), one exact ACK, and one exact post-restart recall for every journey. Codex/Claude bindings are exact and non-null before/after; native bindings remain null by design. The physical native snapshots contain one pre-restart pair followed by one recall pair. Native logs show persisted workspace reconstruction and `restored and stored successfully`. Browser screenshots support, but do not substitute for, the API/physical/provider evidence.

## Final Confidence After Broader Validation

| Confidence Category | Final Score | Final Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 98% | Every critical AC has direct durable or live equivalent-marker proof across configured and standalone paths | Historical already-corrupted records remain explicitly unrecoverable/out of scope |
| Changed-boundary execution directness | 98% | Real product UI/API/process/provider/native boundaries plus physical state | None material |
| Cross-boundary integration realism and mock gap | 97% | Six real browser journeys, real provider/native models, full process loss | Provider service behavior outside the observed turns is external |
| Environment, configuration, identity, and fixture fidelity | 98% | Product package import, exact models, isolated approved secret import, same persisted state, exact IDs | None material |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | Durable fail-closed/concurrency tests plus real full restart and abrupt standalone continuity | No distributed/multi-node path, which is out of scope |
| User-surface, browser, and desktop-shell confidence | 97% | Real Nuxt web-equivalent renderer for all six journeys; screenshots plus semantic API state | Electron shell itself not run because no shell boundary changed |
| Durable regression coverage quality and relevance | 92% | 15 current test paths, 21-file focused pass, two directly related E2E files repaired | Broad repository suites remain red from documented stale test debt |

- Overall final confidence: **96.7%** (`677 / 7`, simple average).
- Every critical acceptance criterion directly proven: `Yes`; the Claude live run uses a unique per-round marker rather than the illustrative literal in `AC-012`, preserving the exact context-dependent semantic condition and preventing evidence collision.
- Any final applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `Yes`.
- Confidence-limiting residual risks: the broad repository baseline is not green; four handled token-usage replay insert attempts produced Prisma error-level log noise, but the repository catches `P2002`, the live database contained 10 rows/10 distinct idempotency keys and no duplicates, and all six journeys completed. This is non-blocking ancillary observability debt, not a continuity failure.

## Temporary Executable Validation Outcome

| Scenario ID | Probe / Runtime Setup | Result | Why Not Durable |
| --- | --- | --- | --- |
| `LIVE-TEAM-CODEX-001`, `LIVE-TEAM-CLAUDE-001`, `LIVE-TEAM-NATIVE-001` | Real browser, owned API/web, real providers/native, product-imported Classroom team, full process restart | `Pass` | Credential/cost/process/browser journey has no existing durable browser harness; deterministic lower contracts are durable. |
| `LIVE-DAILY-CODEX-001`, `LIVE-DAILY-CLAUDE-001`, `LIVE-DAILY-NATIVE-001` | Same environment, individual Daily Assistant runs across all runtimes | `Pass` | Same reason; API projections/provider files are retained, secrets/state are not. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up |
| --- | --- | --- | --- |
| Electron preload/IPC/window/package lifecycle | No changed shell code; browser covers the affected renderer/API journey | None material | None |
| Recovery of historical external null IDs, placeholder standalone Claude records, or overwritten native snapshots | Explicitly unrecoverable/out of scope | Existing damaged records fail closed | None in this ticket |
| Hydration of active delegated task executions after process restart | Explicitly out of scope; new task activation/binding and concurrency are durably covered | Separate known gap | Separate design if requested |
| Multi-node/distributed execution | No changed boundary | None | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Repository-wide broad unit/integration and five unrelated deterministic E2E failures | Existing stale durable-suite debt, not ticket failure | Final broad and E2E logs; focused/live matrix green | Record for future suite maintenance; no ticket rework |
| Four token-usage `P2002` log lines during restored-provider replay | Non-blocking handled idempotency/observability noise | `token-usage-idempotency-check.txt`: 10 rows, 10 distinct keys, zero duplicates; repository catches and resolves existing row | Optional future logging cleanup; no reroute |

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes` — 3 added, 12 updated, 0 files removed.
- Post-repository confidence: **87.7%**, therefore broader validation was required.
- Broader validation decision: `Required and completed` — six browser/lifecycle journeys covering both the Classroom Simulation Team and individual Daily Assistant across Codex, Claude, and native AutoByteus.
- Final result: `Pass` at **96.7%** confidence; every applicable category is at least 90%.
- Reroute Required Before Validation Execution: `No`.
- Required next recipient: `code_reviewer` for proportional review of the 15 changed durable test paths before delivery.
