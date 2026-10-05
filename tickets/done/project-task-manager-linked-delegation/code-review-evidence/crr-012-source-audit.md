# CRR-012 independent cumulative source audit

## Basis and preservation
REQ-BL-008 / SR-014 / ARCH-REV-005; SR-015–017 evidence-only. IR-007, branch codex/project-task-manager-linked-delegation, HEAD806907faeb567d2b703e10fe984fcd01be0b41fd. Current287 non-ticket dirty paths exactly match the supplied fingerprints:135 source/template,86 tests/fixtures,66 other. No missing/mismatched path. Against CRR-007: two existing source owners modified, one previously clean source owner plus two implementation test/fixture paths and one API HTTP test added. All132 unaffected source/template paths retain exact reviewed bytes. Full unaffected structural reasoning remains applicable after approval/hash verification; no missing prior result is treated as Pass.

## Approved primary, event and bounded paths
SCN-002/003/005/006/010/011 and BEH-003–007/010 govern:
ordinary shipped Manager saved-ID delegation -> root-neutral Task lifecycle/reservation/stamped tree -> actual worker start/input association -> explicit business DONE -> same-array closure/fences -> root registered+physical owned forest -> Team independent exact member release -> ConfiguredAgentExecutionHandle -> AgentRunManager -> same AgentRun.forceReleaseRuntime -> CodexBackend -> exact ThreadManager/Thread/lease -> actual terminal event -> associated input observer -> accepted AgentRun/member release -> genuine terminal callback -> registry/Team finalization -> public rows.
Only local native outcome handling changed; business ack never becomes physical proof.

Native interrupt response and idle are separate from typed turn/completed. Thread.setCurrentStatus:174 now updates projection only. Exact activeTurnId, lastTerminalTurnId, MCP context and uncertainty are not cleared there. Thread.markTurnCompleted:162 and terminal-error paths retain actual terminal ownership; notification handler rejects explicit stale boundaries. ThreadReleaseScope waits pending start/steer/approval RPCs and the exact active-turn terminal before teardown. ThreadManager.releasePreparation:82–112 clears source/router/lease only after that proof, retaining failure authority; native absence is never accepted as canonical input proof.

Converter:49–65 preserves native interrupted as TURN_INTERRUPTED and failed as exact turn-scoped terminal ERROR with provider message; completed remains completed. Input observer maps those genuine types to distinct outcomes. No idle inference, ledger clearing, new DTO or listener filtering.

Backend:41/62–72 owns actual admitted source-event promises. After exact native source closure, terminateRun:187–204 waits that finite set, retains rejected work and returns negative on10s pending proof. Successful continuations are deleted; pending same-backend retry observes eventual completion without new start/lease/seed. Failed delivery remains negative; it is not replayed or declared repaired. Source-event accounting belongs to the existing concrete backend, not a shared Task scheduler. AgentRun termination waits outside its FIFO, so draining the sole canonical subscriber does not queue a self-await behind finalization. Input guard remains unchanged at AgentRun:492 / admission-state:430.

## Material premise discrimination
SR-017's extra preceding subscriber proves a capability seam ONLY. Production search has AgentRun:106 as sole actual source-batch subscriber. AgentRun.publishSourceEvents:292 synchronously enqueues canonical work; termination:487–501 queues the input assertion behind existing processing. The supplied actual-default-pipeline negative control confirms old backend with T+C still settles successfully after a finite delayed pipeline. Do not attribute a second historical/default-pipeline race to the controlled subscriber.
The backend drain is supported independently by reviewed DS-003/007 finite admitted-continuation/exact-proof contract, exercised by the normal interrupt -> backend -> sole AgentRun -> actual async default pipeline path. It strengthens truthful backend continuation settlement, not a claim that old FIFO protection failed. Native and source-delivery owners close different scopes. No external listener/replay feature is prescribed.

Incoming/current immediate automatic terminal controls both succeed5/5 (incoming falsely reports completed). The idle-loss defect is ordering-sensitive; no inevitable failure or production frequency inference. The native watch/typed-terminal interval is independently supported by pinned0.160.0 source and the approved DONE-while-submitted workflow, not invented from the latch.

Original exact native rollout confirms interruption; original diagnostic confirms forwarded input with lost native authority. Leading historical causal explanation is premature idle teardown, but original wire/stage/backend receipt remains unobserved. Fresh experiment accepted:true is not a historical receipt. First/ordinary inner errors and independent FAPI-007 are not retrocertified.

## Test/readiness judgment
New251-line suite and36-line child are coherent provider-free production-owner regression, no source thresholds. Actual client/shared leases/router/ThreadManager/Thread/backend/AgentRun/input/default pipeline used. Only native protocol schedule, finite source continuation probe and skill cleanup controlled. Actual backend accepted/negative returns captured, not manufactured. Tests preserve genuine terminal type, exact thread/turn/no-new-start retry, late ingress fence and borrowed holder. External subscriber rejection/delay cases are bounded backend contract controls, not evidence that production installs that subscriber. Child teardown is environment cleanup, not Task repair; finally closes owned child and workspace.
No existing test altered by IR-007. API HTTP compact-output oracle remains separate for later successful-test review. Existing mocked backend getThread diagnostic and unchanged strict TOOL_LOG failures retain their limits.

## Cumulative structure and cleanup
Existing Task business/store/context, root scope, opaque Manager/preparation, exact concrete provider controls, public allowlist and source-copy routing remain distinct. CRF-001 quiet descendant authority, CRF-002 independent private release, CRF-003 strict public projection, CRF-004 committed terminal publication and scoped business-only prompt/output closures remain by unchanged hashes/current neighbor controls. No fresh subsystem/helper, dual-version branch, startup converter, provider-global Stop or Manager protocol.
Size audit below excludes tests/fixtures/dist. All changed source files remain below500 conservative raw nonempty. Only prior AgentRunManager299 and ClientManager232 cumulative deltas exceed220; prior ownership/refactor justifications retained, no new pressure. Local3 source deltas below220. Source max AgentRun499raw/489effective unchanged.

## Complete changed-source size table

| Source/template path | Raw/effective nonempty | Cumulative delta | >500 / >220 | Ownership/placement action |
|---|---:|---:|---|---|
| autobyteus-server-ts/src/agent-collaboration/collaborators/message-recipient-resolution.ts | 124/95 | 33 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/collaborators/task-scoped-message-recipient.ts | 31/30 | 31 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts | 118/118 | 15 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-activation-planner.ts | 170/169 | 51 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts | 433/423 | 106 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/backends/frozen-root-termination-scope.ts | 54/53 | 4 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/backends/root-agent-execution-registry.ts | 297/279 | 67 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/backends/root-team-execution-directory.ts | 294/278 | 111 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-adapter.ts | 39/38 | 1 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-engine.ts | 81/80 | 10 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/services/active-collaboration-root-directory.ts | 95/93 | 3 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-dispatch.ts | 70/69 | 70 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-adapter.ts | 96/93 | 110 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts | 256/234 | 142 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-lifetime-scope.ts | 89/86 | 89 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/task/task-delegation-command.ts | 50/47 | 20 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-input.ts | 36/35 | 2 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-lifetime.ts | 34/34 | 34 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-seed-admission.ts | 11/10 | 11 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-tree-projection.ts | 55/53 | 5 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-collaboration/execution/task/task-lifetime-operation-gate.ts | 27/26 | 27 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts | 225/217 | 74 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend.ts | 115/107 | 9 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-factory.ts | 10/9 | 10 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-preparation.ts | 59/58 | 59 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts | 119/117 | 32 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts | 144/142 | 5 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-background-process-groups.ts | 76/63 | 18 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts | 144/138 | 65 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts | 485/485 | 50 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts | 63/63 | 11 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts | 58/58 | 88 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts | 122/122 | 16 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-cleanup.ts | 37/36 | 27 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts | 173/173 | 45 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-process.ts | 116/112 | 174 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-state-input.ts | 23/23 | 4 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts | 484/463 | 35 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts | 57/57 | 80 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts | 237/234 | 29 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts | 393/390 | 27 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts | 38/38 | 16 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-turn-event-converter.ts | 68/68 | 17 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts | 110/110 | 5 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-input-submission.ts | 99/99 | 99 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts | 233/233 | 160 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-release-scope.ts | 48/47 | 48 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts | 424/420 | 132 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/provider-preparation-guard.ts | 8/7 | 8 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/backends/shared/workspace-skill-materializer.ts | 328/312 | 77 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/domain/agent-run.ts | 499/489 | 32 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts | 48/48 | 7 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/input/agent-run-execution-admission-fence.ts | 14/13 | 14 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts | 210/210 | 6 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/runtime/agent-run-activation-registry.ts | 288/288 | 31 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/services/agent-run-activation-candidate.ts | 64/60 | 18 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/services/agent-run-activation-operation.ts | 115/114 | 115 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts | 324/322 | 299 | Pass / reviewed prior signal | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts | 124/124 | 53 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/services/managed-agent-run-termination.ts | 55/54 | 11 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts | 412/409 | 10 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run-options.ts | 36/35 | 36 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts | 464/445 | 86 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-org-execution/services/agent-org-communication-adapter.ts | 76/75 | 4 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-index.ts | 326/308 | 18 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-scope-builder.ts | 223/213 | 5 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-org-execution/services/agent-org-recipient-resolver.ts | 73/59 | 2 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-org-execution/services/agent-org-task-execution-adapter.ts | 359/357 | 162 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts | 480/457 | 59 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-communication-adapter.ts | 77/76 | 4 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-execution-index.ts | 279/263 | 18 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-recipient-resolver.ts | 67/56 | 2 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-root-builder.ts | 179/168 | 5 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-task-execution-adapter.ts | 347/341 | 153 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts | 42/41 | 10 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/domain/prepared-task-execution.ts | 67/64 | 53 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts | 451/436 | 52 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/domain/task-agent-execution.ts | 17/15 | 2 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/domain/task-team-execution.ts | 18/16 | 3 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts | 87/83 | 55 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/flat-team-agent-execution-handle.ts | 188/187 | 19 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-callbacks.ts | 25/23 | 1 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-factory.ts | 168/164 | 97 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager-options.ts | 15/14 | 15 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager.ts | 462/453 | 171 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/flat-team-run-backend.ts | 50/50 | 8 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/owned-flat-team-runtime-release.ts | 14/13 | 14 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/prepare-flat-team-configured-activation.ts | 26/25 | 26 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/registries/collaborator-team-execution-registry.ts | 73/67 | 7 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/registries/task-agent-execution-registry.ts | 256/236 | 67 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/registries/task-team-execution-registry.ts | 189/185 | 114 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/local/task-team-execution-factory.ts | 81/80 | 59 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/services/team-execution-index.ts | 376/355 | 18 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/services/team-flat-execution-callbacks.ts | 93/91 | 2 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/services/team-root-materializer.ts | 133/131 | 9 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/services/team-run-message-delivery.ts | 111/102 | 9 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/services/team-run-resolver.ts | 96/95 | 12 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-adapter.ts | 302/300 | 160 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-service-contract.ts | 38/37 | 2 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-service.ts | 51/50 | 21 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts | 227/227 | 6 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts | 55/54 | 4 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-manifest.ts | 63/61 | 60 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts | 28/28 | 6 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts | 43/43 | 4 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts | 246/246 | 8 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts | 35/31 | 2 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent-config.json | 12/12 | 12 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent.md | 11/11 | 11 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts | 51/51 | 5 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/persistence/file/store-utils.ts | 237/236 | 2 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/projects/context/project-task-context-store.ts | 181/177 | 1 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/projects/domain/models.ts | 90/83 | 2 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/projects/domain/project-errors.ts | 30/30 | 8 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/projects/domain/project-task-execution-state.ts | 47/47 | 47 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/projects/domain/project-task-execution.ts | 13/13 | 13 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/projects/runtime/project-task-runtime-release.ts | 44/43 | 44 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/projects/services/project-task-service.ts | 271/269 | 125 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/projects/stores/project-metadata-schema.ts | 54/50 | 54 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/projects/stores/project-state-schema.ts | 95/93 | 95 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/projects/stores/project-store.ts | 49/47 | 148 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/run-history/domain/run-execution-tree-shared-records.ts | 152/128 | 3 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/run-history/store/run-execution-tree-shared-record-schemas.ts | 448/426 | 3 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/runtime-management/acp/acp-agent-process.ts | 79/71 | 25 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts | 457/450 | 109 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-process-owner.ts | 187/179 | 187 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-session-opening.ts | 99/97 | 99 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-streaming-session.ts | 140/131 | 19 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts | 108/106 | 232 | Pass / reviewed prior signal | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts | 358/355 | 61 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-view-projector.ts | 80/79 | 7 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/services/agent-streaming/agent-org-execution-view-projector.ts | 91/91 | 7 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/services/agent-streaming/collaboration-execution-tree-dto-projection.ts | 100/98 | 100 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-server-ts/src/services/team-communication/team-communication-adapter.ts | 102/101 | 4 | Pass / below | Existing concern/owned structure; no split required |
| autobyteus-ts/src/agent/factory/agent-factory.ts | 214/213 | 11 | Pass / below | Existing concern/owned structure; no split required |
