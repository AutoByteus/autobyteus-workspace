# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/design-spec.md`
- Supplemental Task Artifacts: `ui-ux-spec.md`; `investigation-evidence/user-verification-electron-29695/user-verification-summary.json`; `LIVE_EARLY_SELECT_SR006_A-summary.json`; `LIVE_EARLY_SELECT_SR006_A-reconnect-status.json`; `reproduce-live-selected-before-work.cjs`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/code-review-revision-record.md`
- Delivery Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/delivery-revision-record.md`
- Relevant upstream revisions: `SR-006`, `ARCH-REV-006`, `IR-003`, `CRR-005`, `DR-003`, `USER-VERIFY-001`
- API/E2E Revision: `API-REV-003`, round 3
- Implementation tested: `fe9f1a286b37ce53d33999b1155bd189822a0a24`
- Trigger: renewed source-review Pass after IR-003 replaced the task-Agent registry's permanent preparation sink with the prepared/releasing/live/aborted durability gate.
- Prior investigation reviewed: yes. API-REV-001/002 remain historical proof for the earlier frontend correction and durable browser fixtures. DR-003 supersedes their earlier delivery-readiness conclusion, so no previous result or confidence is carried forward for AC-017.
- Investigation timing: the initial round-3 investigation and coverage classifications were written before final execution or any proposed durable edit; this canonical document now records the completed decisions and results.

## Requirement And Changed-Boundary Basis

The material changed boundary is direct task-Agent event egress. Before durable task activation, task-Agent Agent events must remain private. Durable task commit and `TASK_AGENT_ACTIVATED` must precede release. Release must drain buffered events FIFO, including synchronous reentrant events, then forward later events exactly once through the existing root Team publisher. Abort, preparation failure, and committed-but-unreleased disposal must publish no task-Agent events and start no assignment work.

AC-017 additionally requires real-system proof through an already-open Team: configured `/student_one` delegates a marked direct task to configured `/student_two` with runtime `codex_app_server` and model `gpt-5.6-luna`; the exact task is selected before its later work; the actual root Team socket carries activation before all exact task-Agent frames with monotonic root sequences and representative status/turn/content/tool frames; without reload or refocus, the selected tree/header/monitor/Activity advance beyond the assignment snapshot and finish consistent with the exact projection and root snapshot. A second task at the same address and the configured member must remain isolated identities.

Persisted data remains `Directly Usable — No Migration`. IR-003 changes in-memory delivery only and introduces no legacy reader, dual write, version branch, schema migration, or compatibility-only behavior.

| Boundary | Affected | Required evidence | Mock / residual gap |
| --- | --- | --- | --- |
| Registry state and lifecycle | Yes | Owner unit tests for privacy, activation/release order, FIFO/reentrancy, exact-once live forwarding, idempotence, abort/disposal/no-work | Unit publisher spy does not prove root WebSocket delivery. |
| Root Team publisher / DTO / WebSocket | Yes | Actual current-source Team socket, exact run IDs, activation ordering, root sequences and frame classes | Existing live suite did not make all required ordering assertions and has a separate stochastic notification expectation. |
| Browser / selected exact context | Behaviorally yes | Current backend + current Nuxt + actual Chrome, early selection and no reload/refocus | Historical mocked and fresh-open evidence cannot prove server event egress. |
| Identity isolation | Preserved but critical | Two task runs for `/student_two`, plus configured `/student_two`, selected and projected separately | Same display name/address can conceal wrong run-key lookup. |
| Persistence / projections | Preserved | Current writers and current projection/root-snapshot readers agree with live UI | No migration scenario applies. |
| Electron shell | No | N/A | No preload, IPC, packaging, or window-management path changed; browser is the preferred web-equivalent surface. |
| External runtime | Validation dependency | Actual authenticated Codex app server with exact Luna model | Stochastic output controlled with exact bounded markers and generous waits. |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility`.
- Relevant instructions: `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/README.md`, `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md`, both package manifests, and the existing runtime/browser probes.
- Stack: pnpm monorepo; Node/TypeScript/Fastify/GraphQL/WebSocket backend; Nuxt/Vue/Pinia frontend; Vitest; Playwright Core driving installed Chrome; Codex app-server runtime.
- Documented server path: build, then run `node dist/app.js --data-dir <owned> --host 127.0.0.1 --port <owned>` and check `/rest/health`.
- Documented test path: focused non-watch Vitest via `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; named web E2E scripts via `pnpm -C autobyteus-web ...`.
- Web proxy path: `BACKEND_NODE_BASE_URL` points current Nuxt GraphQL/REST/Team WebSocket traffic to the owned current backend.
- Runtime availability: Codex CLI authentication was available; the exact server catalog contained `gpt-5.6-luna`. No secret value was copied into evidence.
- Data safety: the authoritative run explicitly used `DATABASE_URL=file:/tmp/autobyteus-api-rev-003-ac017-isolated-61117/db/production.db` and a separate temporary workspace. The user's existing Electron server on 29695, Docker node on 8001, and LM Studio on 1234 were not stopped or mutated.

## Existing Durable Coverage Inventory And Final Validity Decisions

| Path / scenario | Intent | Decision | Final action / evidence |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts` | Prepared/releasing/live FIFO including reentrancy, exact-once forwarding, idempotent release, abort/disposal/no-work | **Still Valid** | Independently rerun with invariant companion: 12/12 passed. This directly proves mandatory failure/pre-durability behavior. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-current-invariants.test.ts` | Durable activation publication precedes release/work | **Still Valid** | Rerun in the same focused command: passed. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Real server/root socket/direct task lifecycle using mixed runtimes | **Needs Update, deferred** | A temporary assertion-only experiment was reverted. The live scenario emitted exact task-Agent frames (sequences 919–948), but failed its unchanged stochastic `worker activation system task notification` expectation and then timed out in cleanup hooks. This is not evidence against IR-003; it is also not a passing durable AC-017 guard. No repository-resident edit remains. The current mandatory socket proof is retained as a ticket-scoped deterministic current-source/Codex-Luna probe. |
| `autobyteus-web/tests/e2e/task-agent-monitor-visibility-probe.mjs` and fixture | Exact selection/hydration plus snapshot invalidation -> settlement -> fallback projection reconciliation | **Still Valid** | Rerun in actual Chrome; API-E2E-TMV-001/002 passed. It remains supplemental rather than a substitute for actual server events. |
| `autobyteus-web/tests/e2e/background-agent-renderer-contention-probe.mjs` and fixture | Current focus authority and background contention | **Still Valid** | API-REV-001/002 and CRR-004 remain applicable; no changed-surface signal required another rerun. |
| Historical API-E2E-LIVE-001/node-8001 retained-data evidence | Fresh-open exact task/configured retained data | **Still Valid but insufficient alone** | Supporting direct-reader proof only; not reused as AC-017 execution proof. |

### Stale / Removal Decisions

No durable coverage was removed. No compatibility-only scenario was added or retained. The historical artifacts remain valid only for the explicitly bounded behavior above.

### Durable Coverage Decision

- Repository-resident durable coverage added, updated, or removed in API-REV-003: **No**.
- The initial proposal to strengthen `mixed-task-delegation.e2e.test.ts` was not retained because the only available live scenario is long-running/stochastic and currently fails an unrelated existing model-notification assertion plus cleanup timeouts. Preserving an unreviewed edit in a non-passing scenario would reduce, not improve, durable evidence quality.
- The changed gate itself has direct durable unit coverage. The current actual socket/browser/model journey is ticket-scoped because it depends on authenticated external Codex execution and ephemeral exact run identities. Its probe sources, raw frames, screenshots, summaries, and logs are retained for reproducibility and inspection.
- Follow-up coverage debt: repair/reframe the existing mixed-runtime notification expectation and cleanup determinism before promoting the AC-017 socket assertion into that durable suite. This is nonblocking for the current implementation because the required actual boundary passed independently.

## Repository Coverage Execution Results

| Order | Command / mode | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts tests/unit/agent-team-execution/task-delegation-current-invariants.test.ts --no-watch` | Gate, release, abort/no-work invariants | **Pass — 2 files, 12 tests** | `api-e2e-evidence/api-rev-003/owner-unit.log` |
| 2 | `pnpm -C autobyteus-web test:e2e:task-agent-monitor-visibility -- --output-dir ../tickets/.../api-rev-003/task-monitor` | Exact retained selection and settlement/fallback regression in Chrome | **Pass — 2 scenarios** | `api-e2e-evidence/api-rev-003/task-monitor/evidence.json`; `task-monitor.log` |
| 3 | `pnpm -C autobyteus-server-ts build` | Production current-source build/bootstrap | **Pass** | `api-e2e-evidence/api-rev-003/server-build.log` |
| 4 | focused `RUN_MIXED_TASK_DELEGATION_E2E=1 RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1` live mixed-runtime Vitest | Supplemental existing root-socket scenario | **Fail — unrelated unchanged notification assertion; afterEach/afterAll timeouts** | `api-e2e-evidence/api-rev-003/mixed-task-live.log` |
| 5 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`; `git diff --check`; durable-test diff check | Production TS config and clean API/E2E-owned durable diff | **Pass** | `api-e2e-evidence/api-rev-003/guards.log` |

## Post-Repository Confidence Scorecard

| Category | Score | Evidence | Remaining gap before broader validation |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 85% | Direct gate unit and existing frontend lifecycle probe passed. | AC-017 actual socket/browser/Codex journey not yet proven. |
| Changed-boundary execution directness | 88% | Owner state machine executed directly. | Root publisher/socket path not yet authoritative. |
| Cross-boundary integration realism and mock gap | 75% | Actual Chrome probe exists but its task stream is controlled. | Current backend -> actual Codex -> root WS -> current browser required. |
| Environment/configuration/identity/fixture fidelity | 85% | Current production build and exact setup plan. | Exact Luna configuration and isolated real identities must be captured. |
| Failure/edge/lifecycle/recovery | 97% | Direct pre-release, abort, disposal, reentrant FIFO, exact-once tests. | Public-process fault injection not required; actual live release still pending. |
| User-surface/browser/desktop-shell | 82% | Actual Chrome supplemental probe passed; no shell boundary changed. | Already-open early-selected live journey pending. |
| Durable regression coverage quality | 92% | Strong owner unit and frontend browser coverage. | Existing live mixed-runtime suite has a bounded notification/cleanup health gap. |

- Overall post-repository confidence: **86.3%** (simple average, 604/7).
- Every critical acceptance criterion directly proven: **No** — AC-017 actual current socket/browser journey was pending.
- Broader validation decision: **Required — Live API + actual root WebSocket + Browser**.
- Expected gain: close server/publisher/socket/projector/store/renderer and exact external runtime/model gaps rather than rely on mocks or historical fresh-open evidence.

## Broader Validation Plan And Completed Result

The authoritative run started current `fe9f1a286` production server output on owned port 61117 with an explicit isolated SQLite URL/data directory, current Nuxt on 61118, and a new isolated Chrome context. Public GraphQL created only the two marked configured agents, the marked Team, and the TeamRun. Both root and configured member launch configurations were asserted as `codex_app_server` / `gpt-5.6-luna`.

The browser opened the Team before delegation, delegated two marked direct tasks from `/student_one` to `/student_two`, selected each exact task at its assignment snapshot, and observed later live activity without reload/refocus. An independent short rerun selected task one, configured `/student_two`, and task two to assert same-address rendered-row and projection isolation.

All mandatory outcomes passed. For task one, activation index 30 preceded 82 exact task-Agent frames; 164 collected root sequences were strictly increasing and unique. For task two, activation index 183 preceded 78 exact frames; 307 collected root sequences were strictly increasing and unique. Each run included exact status, turn, content, and tool event classes. Both selected views advanced from 1 conversation/1 Activity item at assignment to 2 grouped messages/4 Activity items, ended Idle, retained START/DONE/COMPLETE and tool evidence, and agreed semantically with the exact projection and root snapshot. Navigation count remained six from selection through final state.

The main ticket probe initially reported `Fail` only because its aggregate same-address helper expected DOM `data-transient-kind="task"`; the actual renderer contract is `task_agent`. Every material task, socket, projection, model, focus, navigation, and page-error assertion in that run was already true. The ticket probe was corrected, and the independent real DOM/projection isolation rerun passed all eight assertions. The original raw summary is retained rather than overwritten; `authoritative-summary.json` explains and combines the inspectable evidence.

An earlier setup attempt inherited a global shared `DATABASE_URL`; it is non-authoritative. Its marked run/definitions were terminated/deleted through public GraphQL, the shared DB was queried to confirm no matching IDs remained, and its temporary workspace was removed (`ac017-cleanup.json`). The authoritative rerun used explicit isolated storage and was fully removed after stopping owned ports 61117/61118/61124. Pre-existing ports 29695/8001/1234 remained listening.

## Final Confidence And Decision

| Category | Final score | Direct basis | Residual uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 99% | Every mandatory SR-006/AC-017 assertion passed through direct gate, socket, projection, and browser evidence. | Negligible stochastic-model timing variance. |
| Changed-boundary execution directness | 99% | Owner gate executed directly; current root socket observed real post-release exact Agent frames. | No production multi-node variant applies. |
| Cross-boundary integration realism and mock gap | 99% | Current production server + GraphQL + actual root WS + real Codex Luna + current Nuxt + Chrome. | None material. |
| Environment/configuration/identity/fixture fidelity | 99% | Exact model/runtime, isolated DB, public setup, exact root/task/configured IDs captured. | Test-only marked definitions differ only in content from user definitions. |
| Failure/edge/lifecycle/recovery | 98% | Direct abort/disposal/no-work and FIFO/reentrant/idempotent unit proof plus two successful real releases. | Failure injection is owner-unit rather than a destructive public API hook. |
| User-surface/browser/desktop-shell | 99% | Already-open early selection passed twice in actual Chrome; screenshot and DOM/Pinia evidence inspected. | Electron shell was intentionally not run because no shell boundary changed. |
| Durable regression coverage quality | 92% | Durable gate unit and frontend lifecycle/browser coverage are strong and current. | Existing mixed-runtime live suite's unrelated stochastic notification/cleanup expectation remains coverage debt; socket AC-017 evidence is ticket-scoped. |

- Overall final confidence: **97.9%** (simple average, 685/7).
- Every critical acceptance criterion directly proven: **Yes**.
- Any applicable category below 90%: **No**.
- Default 95% target met: **Yes**.
- Final result: **Pass**.
- Final routing: `/code_reviewer` for proportional review; because no repository-resident durable coverage changed, the expected test-code review result is `Not Applicable`.

## Authoritative Evidence

- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-evidence/api-rev-003/ac017-isolated/authoritative-summary.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-evidence/api-rev-003/ac017-isolated/evidence.raw.json.gz`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-evidence/api-rev-003/ac017-isolated/isolation-evidence.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-evidence/api-rev-003/ac017-isolated/AC017_CURRENT_SOURCE_FINAL_TASK_TWO-final.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-evidence/api-rev-003/ac017-isolated/cleanup.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-evidence/api-rev-003/owner-unit.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-evidence/api-rev-003/task-monitor/evidence.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-evidence/api-rev-003/mixed-task-live.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-evidence/api-rev-003/guards.log`
