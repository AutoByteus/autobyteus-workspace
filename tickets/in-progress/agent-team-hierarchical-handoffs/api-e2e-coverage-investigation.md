# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Supplemental Task Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-revision-record.md`
- Delivery Re-entry Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/delivery-integration-blocker.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/delivery-revision-record.md`
- Relevant Delivery Revision: `DR-002`.
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-004`
- Current Investigation Round: `4`
- Trigger: `CRR-007` Pass for integrated `IR-004` merge commit `ef32724ddb50db9858cb92ca1e61f3bac1eddbd1`.
- Prior Investigation Reviewed: Round 3 / `API-REV-003`, which proves the pre-merge SR-006 checkpoint at `a5ef1d5bba271da23cb32db74a68829d1c0c63a8`, not the integrated state.
- Latest Authoritative Investigation: this file. The initial round-4 plan was written before any API/E2E-owned durable edit or integrated-state execution and was maintained as validity and execution evidence arrived.

## Current Requirement And Integrated Design Basis

IR-004 is an integration-only Local Fix. It must preserve SR-006's exact frozen caller context `{rootTeamRunId,memberAddress}`, exact Agent `{kind,address}` / Team `{kind,address,ingressAddress}` placement, address-derived root-private message delivery, parent-first task mapping, handoffs, restore, events, and provider envelopes (R-028–R-031; AC-023–AC-025). At the same time it adopts the integrated base's leaf-Agent status snapshot and open-execution-work lifecycle. Aggregate Team status snapshots/events, `MixedTeamEventBus`, and `MixedTeamStatusPublisher` are obsolete and must not remain as positive fixture authority or compatibility behavior.

The merge resolves three production and two durable-test conflicts. The integrated proof therefore must cover: root-canonical child-to-parent delivery; Team placement-to-ingress private materialization; child leaf snapshot prefixing; open-work propagation; no aggregate Team status events; TeamRun create/restore/routing/termination; the three API-REV-003 exact-context integrations; task-Team settlement through supported accepted-task reconciliation; and affected deterministic API/E2E behavior. Broader execution/history/event `memberPath` identities remain outside SR-006 and are not stale merely by name.

SR-006 persisted data remains `Not Affected`; the handoff snapshot remains `Directly Usable — No Migration`. The merge adds no migration or version fallback.

## Changed Behavior Summary

| Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| SR-006 collaboration context/placement/message/task | Preserved through integration | R-028–R-031; AC-023–AC-025; IR-004; CRR-007 | Fresh exact/context, message, task, restore, provider, and API execution on merge HEAD. |
| Root/child mixed-Team delivery seam | Conflict-resolved | IR-004 production trace | Prove canonical parent forwarding and private root materialization still coexist with current lifecycle behavior. |
| Team runtime lifecycle/status | Integrated base behavior adopted | IR-004; CRR-007 | Prove leaf-Agent snapshots, open-work, accepted termination/settlement, and absence of aggregate Team status events. |
| Aggregate Team event/status owners | Removed | IR-004; CRR-007 | Remove/replace stale positive fixture methods or assertions; do not add compatibility tests. |
| Persisted collaboration state | Not Affected / preserved | Design and IR-004 transition checks | Re-execute current data and restore regression; no migration coverage. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Existing Evidence | Residual Risk Before Execution | Selected Mode |
| --- | --- | --- | --- | --- | --- |
| Domain/backend logic | Yes | Mixed manager, child handle, delivery coordinator, TeamRun backend lifecycle | CRR-007 focused source seam; durable units/integrations | Merge-resolved tests need API validity adjudication; inherited stale aggregate fixtures exist | Focused + affected Vitest |
| API/transport/contract | Yes, preserved | GraphQL/WebSocket/external channel consume TeamRun lifecycle and collaboration | Runtime-selection, conversation-target, external-channel, repository E2E | Several fixtures expose removed aggregate status API | In-process API/E2E |
| Frontend/browser/desktop | No ticket-owned resolution | No conflict-resolved frontend source; latest base's frontend is already integrated base behavior | Base's prior independent coverage | None material from these backend conflict resolutions | None unless API evidence exposes a gap |
| Authentication/permissions | No | No change | Existing gating regression | None | None |
| Process/lifecycle | Yes | Leaf snapshots, open-work, termination/settlement, child bind/unbind | Manager, TeamRunManager, websocket lifecycle, task lifecycle | Merge-HEAD composition proven; no material ticket residual | Lifecycle/API |
| Persisted data | No schema change | Runtime-derived collaboration values and existing snapshot restore | API-REV-003 scenarios remain structurally valid | Must rerun after merge | Repository regression |
| Worker/distributed/external provider | No changed dependency | Deterministic native/MCP/provider projection preserved | Existing adapter suites | Live model processes capability-gated | Deterministic adapter execution |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs`
- Integrated HEAD: `ef32724ddb50db9858cb92ca1e61f3bac1eddbd1`; parents `a5ef1d5b...` and `ed3aa872...`; branch is reported 0 behind `origin/personal` by CRR-007.
- Stack: pnpm workspace; Node.js/TypeScript; Fastify/Mercurius GraphQL; Prisma/SQLite; Vitest 4.0.18.
- Authoritative instructions: `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/README.md`, root/server `package.json`, `autobyteus-server-ts/vitest.config.ts`, `.env.test`, and Prisma test setup.
- Safe environment: project-owned `.env.test`, SQLite, sockets, and temp roots. External provider credentials are not required; declared capability skips will not be counted as passes.
- Protected state: delivery `stash@{0}`, `/tmp/agent-team-hierarchical-handoffs-dr001-protect.bh368u/delivery-protect.tar`, untracked delivery artifacts, and protected long-lived docs are delivery-owned and will not be applied, dropped, rewritten, or removed.

| Component | Command / Setup | Readiness | Cleanup |
| --- | --- | --- | --- |
| Focused/affected repository coverage | `pnpm exec vitest run <paths> --no-watch` in server package | Prisma setup and suite collection | Vitest/project hooks |
| Deterministic E2E | root `pnpm test:e2e` | App/socket/test-store helpers | Existing finalizers |
| Production compile/build | server build-config `tsc`; `pnpm run build:full` | Exit 0 and bootstrap smoke | No persistent process |
| Whole-server baseline | `pnpm exec vitest run --no-watch` | Full collection | Project hooks; classification only, not automatic ticket attribution |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` for IR-004/SR-006; prior handoff snapshot is `Directly Usable — No Migration`.
- Representative data: current Team definition/handoffs, TeamRun metadata, restored Coordinator/Specialist, task Agent/Team child contexts, memory/event data.
- Executed evidence: exact-context integrations, TeamRun service/restore, task lifecycle, memory projection, runtime-selection API, affected E2E.
- Migration-specific completion/recovery: `N/A`.
- Ambiguity/reroute: `None`.

## Existing Durable Coverage Inventory And Initial Validity Decisions

| Path / Scenario | Current Intent | Requirement / Integrated Contract | Validity Decision | Evidence / Planned Action |
| --- | --- | --- | --- | --- |
| `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Create/restore/route/evict/terminate using leaf/open-work backend shape | AC-025; IR-004 lifecycle | Still Valid | Conflict resolution replaced aggregate methods with leaf/open-work. Retain and execute. |
| `tests/unit/agent-team-execution/mixed-team-manager.test.ts` | Canonical parent forwarding/private materialization plus leaf snapshots/open-work/no aggregate events | AC-025; IR-004 | Still Valid | Conflict resolution preserves SR-006 and current lifecycle semantics. Retain and execute. |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Exact persistent/task contexts and task lifecycle | AC-023, AC-025; IR-004 | Still Valid | Integrated base replaced test-only aggregate status with accepted-task reconciliation/open-work. Retain and execute. |
| `tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Exact mixed member context plus memory/event | AC-023, AC-025; integrated Agent lifecycle | Needs Update — discovered by focused execution | Exact canonical assertion remains valid. Its fake Agent backends lacked `getLifecycleSnapshot` / source-event-batch subscription, and fourteen scenarios still invoked removed `AgentRun.emitLocalEvent`; update all to the current backend batch and public `publishEvent` boundaries without changing memory expectations. |
| `tests/integration/api/runtime-selection-top-level.integration.test.ts` | Exact create/restore contexts and GraphQL/WebSocket journey | AC-023, AC-025; integrated Agent/Team lifecycle | Needs Update | Exact SR-006 assertions remain valid. Its Team backend used aggregate status methods and its Agent backend lacks the integrated lifecycle/source-batch contract; replace both fixture seams. |
| `tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts` | Backend delegates manager operations/runtime state | IR-004 TeamRun backend | Needs Update | Positive assertions call removed `getStatusSnapshot` and manager stub uses removed member snapshots. Replace with leaf/open-work assertions. |
| `tests/integration/agent-team-execution/team-run-service.integration.test.ts` | TeamRun create/restore/persistence | AC-025; current TeamRun backend | Needs Update | Typed backend fixture still carries removed aggregate methods. Replace with current leaf/open-work methods. |
| `tests/integration/agent-team-execution/team-conversation-target-websocket.integration.test.ts` | Team conversation-target WebSocket routing | AC-025; current TeamRun API | Needs Update | TeamRun fixture still exposes removed aggregate status methods. Replace with leaf/open-work behavior. |
| `tests/integration/run-history/memory-layout-and-projection.integration.test.ts` | TeamRun memory/history projection | AC-025; current TeamRun backend | Needs Update | Typed backend fixture still carries removed aggregate methods. Replace with current methods. |
| `tests/e2e/external-channel/external-channel-team-open-delivery.e2e.test.ts` | Real Team open-delivery/event projection | AC-025; current TeamRun backend | Needs Update | Deterministic backend class still implements removed aggregate methods. Replace with leaf/open-work behavior. |
| Canonical address, placement, child handle, delivery coordinator, event bridge, task mapper/service, lifecycle WebSocket, provider suites | Direct changed and preserved seams | AC-023–AC-025; IR-004 | Still Valid | Retain and execute in focused/affected selections. |
| Broader execution/history `memberPath` fixtures | Existing runtime/history identity | Explicit SR-006 non-goal | Out Of Scope for removal | Do not delete based on field name alone. |
| Deleted aggregate status test/owners | Obsolete aggregate Team status behavior | IR-004/CRR-007 | Stale / Remove already completed upstream | Do not restore or replace with compatibility coverage; current leaf/open-work tests are the replacement. |

## Stale Or Obsolete Coverage Decisions

No additional durable file removal is planned. Seven useful scenarios require fixture-only maintenance: six expose the removed aggregate Team status interface and one required memory scenario exposes the removed Agent lifecycle/event-injection interface. They are updated in place to the current leaf snapshot/open-work and source-event/publication contracts. The already deleted aggregate-status unit and source owners must remain deleted.

## Durable Coverage To Add

No new file/scenario was required. Current leaf snapshot, open-work, no-aggregate-event, collaboration, restore, task, and API scenarios are adequate after the seven fixture updates and passing execution.

## Durable Coverage To Update

| Scenario ID | Path | Required Update | Basis |
| --- | --- | --- | --- |
| INTEGRATED-API-CTX-001 | `tests/integration/api/runtime-selection-top-level.integration.test.ts` | Keep exact SR-006 assertions; replace Team aggregate methods and stale Agent lifecycle/event subscription methods | AC-023/025; IR-004 |
| INTEGRATED-MEMORY-CTX-001 | `tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Keep exact mixed context/memory assertions; implement current Agent lifecycle/source-event-batch fake | AC-023/025; integrated Agent lifecycle |
| INTEGRATED-BACKEND-001 | `tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts` | Assert current leaf snapshots/open-work delegation | IR-004 lifecycle |
| INTEGRATED-RUN-SERVICE-001 | `tests/integration/agent-team-execution/team-run-service.integration.test.ts` | Use current TeamRun backend lifecycle fixture | AC-025; IR-004 |
| INTEGRATED-WS-001 | `tests/integration/agent-team-execution/team-conversation-target-websocket.integration.test.ts` | Use current TeamRun lifecycle surface | AC-025; IR-004 |
| INTEGRATED-HISTORY-001 | `tests/integration/run-history/memory-layout-and-projection.integration.test.ts` | Use current TeamRun backend lifecycle fixture | AC-025; IR-004 |
| INTEGRATED-EXTERNAL-001 | `tests/e2e/external-channel/external-channel-team-open-delivery.e2e.test.ts` | Implement leaf snapshots/open-work in deterministic backend | AC-025; IR-004 |

## Durable Coverage To Remove

None in this API/E2E round.

## Repository Coverage Execution Plan And Results

| Order | Command / Selection | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 0 | Initial focused current contract, five adjudicated files, six planned fixtures, and conflict seams | Validity discovery | Fail: 18/20 files and 113/132 tests passed; all 19 failures are in two pre-merge fixtures missing integrated Agent lifecycle methods (`getLifecycleSnapshot` / source-event-batch subscription), not observed production mismatches | `api-e2e-evidence/ir004-focused-initial.log` |
| 0b | Focused rerun after backend lifecycle fixture correction | Validity discovery | Fail: 19/20 files and 118/132 tests passed; remaining 14 failures are stale calls to removed test/runtime injection method `AgentRun.emitLocalEvent` in cross-runtime memory coverage | `api-e2e-evidence/ir004-focused-after-lifecycle-fix.log` |
| 1 | Final focused current contract, five adjudicated files, seven maintained fixtures, and conflict seams | SR-006 + IR-004 direct/lifecycle/API composition | Pass: 20/20 files and 132/132 tests | `api-e2e-evidence/ir004-focused-final.log` |
| 2a | Initial affected selection | Selection-validity discovery | Fail: 123/136 files and 853/877 executed tests passed; an ambiguous `tests/integration/agent` prefix unintentionally collected unrelated `agent-execution` and `agent-tools` integration trees. All seven failing files are byte-identical to integrated-base parent `ed3aa872...`; failures are inherited missing/obsolete standalone Agent test fixtures or local model availability, and none intersects the ticket-relative production or seven-file API/E2E durable delta. Preserve as baseline evidence, not ticket acceptance. | `api-e2e-evidence/ir004-affected-broad-initial.log` |
| 2b | Corrected explicit-path affected collaboration, Team execution, Agent API/WebSocket, provider, task, memory/history, and external-channel selection | Proportionate cross-boundary regression | Pass: 121/121 files and 823/823 tests | `api-e2e-evidence/ir004-affected-broad-final.log` |
| 3 | Root `pnpm test:e2e` | Full deterministic E2E | Pass: 51/65 files and 178/228 tests passed; 14 files / 50 tests were explicitly capability-gated or skipped and are not counted as passes | `api-e2e-evidence/ir004-repository-e2e-final.log` |
| 4 | `pnpm exec tsc -p tsconfig.build.json --noEmit` and `pnpm run build:full` | Production compile, assets, sanitized bootstrap | Pass: both commands exit 0; built-in bootstrap succeeds without `DATABASE_URL` | `api-e2e-evidence/ir004-production-typecheck-final.log`; `ir004-build-full-final.log` |
| 5 | Full `pnpm exec vitest run --no-watch` | Current whole-server baseline classification | Non-clean: 26 failed / 518 passed / 32 skipped files; 71 failed / 2814 passed / 112 skipped tests. Static comparison proves all 26 failing files are byte-identical to integrated-base parent `ed3aa872...` and have zero intersection with the ticket-relative merge delta or seven updated files. This is inherited repository-health evidence, not ticket acceptance. | `api-e2e-evidence/ir004-broader-baseline.log`; `ir004-static-audit-final.log` |
| 6 | Static current-interface, no-aggregate-authority, exact-context, diff, conflict, merge-parent, baseline-intersection, and protected-state audit | Structural evidence and failure intersection | Pass: exact merge identity/parents, no unmerged index, clean diff, exact seven-file durable delta, current fixture APIs, obsolete aggregate owners absent, both merge-resolved tests current, zero initial/baseline failure intersection, protected stash/backup present | `api-e2e-evidence/ir004-static-audit-final.log` |

## Post-Repository Confidence Scorecard

The scores below derive only from round-4 integrated-state evidence. API-REV-003's pre-merge score was not carried forward as proof.

| Category | Score | Support | Remaining Uncertainty | Improvement |
| --- | --- | --- | --- | --- |
| Requirement and acceptance proof | 98% | R-028–R-031 and AC-023–AC-025 map to exact context/placement, message/task, restore, lifecycle, provider, and API evidence; 132 focused tests pass | Only live provider-process drift is capability-gated | None material in approved scope |
| Changed-boundary directness | 98% | Conflict-resolved manager, child, delivery, TeamRun lifecycle and removal seams execute directly in focused and 823-test affected coverage | None material | None |
| Cross-boundary realism/mock gap | 96% | Prisma, GraphQL/WebSocket, task settlement, memory/history, external channel, deterministic native/MCP/provider, and full E2E execute | Live Codex/Claude model processes are skipped | Provider-capable environment only if desired |
| Environment/configuration/identity/fixture fidelity | 96% | `.env.test`, migrations, test SQLite/temp roots, exact root/member identities, current Agent source-batch and Team leaf/open-work fixtures | External credentials/models absent | None required for deterministic acceptance |
| Failure/edge/lifecycle/recovery | 97% | Rejection, private materialization, no aggregate Team events, leaf/open-work, accepted settlement, termination, restore, cleanup, and current event publication pass | Whole-server baseline has inherited unrelated failures | Track as repository health outside ticket |
| User/browser/desktop | N/A | No ticket-owned frontend/shell resolution | None material | None |
| Durable regression quality/relevance | 97% | Seven narrow fixture updates preserve useful scenarios; 20/132 focused, 121/823 affected, and 51-file/178-test deterministic E2E collections pass | Proportional durable-test review remains the next gate | Code review |

- Overall post-repository confidence: `97.0%` (`(98+98+96+96+97+97)/6`; N/A excluded).
- Critical criteria directly proven on integrated state: `Yes`.
- Applicable category below 90%: `No`.
- 95% target met: `Yes`.
- Material residual risks: live Codex/Claude model processes remain capability-gated and are not counted as passes. The whole-server baseline is non-clean in 26 files/71 tests, but all failing files are inherited unchanged from the integrated base and have zero ticket/current-test-delta intersection; directly affected and deterministic E2E collections are clean.

## Broader Validation Decision

- Decision: `Required — completed`.
- Mode: `Lifecycle / in-process API / repository deterministic E2E`.
- Gap addressed: conflict resolution crosses root/child delivery and TeamRun lifecycle; API/WebSocket/restore/task/external-channel composition now passes on merge HEAD.
- Final confidence: `97.0%`, with no applicable category below 90%.
- Browser rationale: no ticket-owned UI boundary changed. Server/API lifecycle evidence is the direct surface; browser execution would not improve canonical collaboration proof unless an API contract regression emerges.

## Desktop Application Validation Decision

`N/A`: no desktop renderer, shell, preload, IPC, or packaging conflict resolution is in scope.

## Live Environment And Fixture Plan

- Startup: Vitest project helpers, then root deterministic E2E; no manually retained public service.
- Environment: `.env.test`, Prisma test setup, test-owned SQLite/temp roots/sockets.
- Identities: nested/cross-branch Agents, task Agent/Team, restored Coordinator/Specialist, leaf status snapshots, current TeamRun backend fixtures.
- Evidence: exact result counts, failure paths, lifecycle observations, static audits, full-baseline classification.
- Cleanup: project finalizers only; protected delivery stash/backup/artifacts remain untouched.

## Temporary Executable Validation Plan

| Scenario ID | Method | Behavior | Why Temporary |
| --- | --- | --- | --- |
| STATIC-IR004-001 | Python/`git` structural audit | No positive aggregate-status/collaboration legacy authority; exact merge/test delta; failure intersection | Review evidence complements durable tests. |

## Not Tested / Deferred

| Boundary | Reason | Risk / Follow-Up |
| --- | --- | --- |
| Live Codex/Claude model processes | Capability/credential gated; deterministic adapters are the material contract | Report skips, do not count as pass |
| Browser/desktop | No ticket-owned changed surface | None unless API execution exposes a user-surface gap |
| Distributed/multi-node | No change | None |

## Ambiguities Or Reroute Triggers

None at investigation time. If any failing assertion is not decided by SR-006 plus the integrated leaf/open-work contract, stop and reroute rather than preserving obsolete aggregate behavior.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`.
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes — 0 added / 7 updated / 0 removed`.
- Post-repository confidence: `97.0%`.
- Broader validation: `Required — completed via lifecycle/in-process API/deterministic E2E`.
- Reroute Required Before Execution: `No`.
- Notes: the protected delivery stash/backup and delivery-owned untracked artifacts remained outside API/E2E mutation scope and are still present.
