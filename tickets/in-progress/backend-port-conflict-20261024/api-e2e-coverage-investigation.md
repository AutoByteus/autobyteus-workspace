# API/E2E Coverage Investigation

## Investigation Meta / Authority
Round 1, CRR-002 Pass handoff, 2026-10-26. R1 Approved; D3.1; SR-001..006; ARCH-REV-003; IR-003; CRR-002. Prior API/Delivery revisions: N/A. Large/High reviewed route unchanged. Worktree `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024`, branch `task/backend-port-conflict-20261024`, HEAD5fd30310e, source/build d0338db0b. Delivery owns origin/personal integration.
Upstream: requirements-doc.md, investigation-notes.md, solution-revision-record.md, design-spec.md, design-review-report.md, architecture-review-revision-record.md, implementation-handoff.md, implementation-revision-record.md, implementation-check-ledger.md, code-review-report.md, code-review-revision-record.md; supplements codex-origin-clarification.md, codex-background-investigation.md and their recorded probes; follow-ups.md and resumption-2026-10-26.md. No normative supplement. Baseline probes asserting old defects are not regression tests.

## Approved behavior / scenarios
SCN-001/002/005: accurate visible external conflict and bounded unknown diagnosis; retry never kills unrelated owner, subsequent healthy retry clears stale diagnostic. SCN-003/004: host-owned native active, ended-run and adopted survivor commands terminate on host quit/restart, collectively bounded and absence-confirmed; normal agent stop remains independent. Codex conversation tools use provider ownership, not the native anchor; composed shutdown requires separate proof. User origin accepted, historical command/version unknown. No contrived scenarios added; updater ordering and startup cancellation are supported system-event variants already in D3.1.

## Surface classification
| Boundary | Change / evidence | Residual gap / selected surface |
|---|---|---|
| Backend/native command lifecycle | Changed ownership, launch/result/retirement/stop; IMP-23/25 real child and fault tests | Full host injection and disposal, real agent removal |
| API/transport | Changed Windows captured-child IPC, unchanged public GraphQL/WS | Full product shutdown with actual runtime work |
| Renderer/store | Changed diagnostic union + visible recovery, IMP-29 | Source-current desktop conflict/recovery |
| Desktop shell | Changed awaited quit/restart/update prep, IMP-28 | Current isolated Electron active-work shutdown |
| External provider | Preserved Codex owner; P-011 local SSE actual tools | Full host/desktop retained conversation cleanup |
| Persistence | Not Affected; no migration | Owned data sentinel continuity only |
| Authentication/worker/distributed | Not independently changed | Private credentials-free fixture; no extra distributed scope |

## Project execution discovery
Root AGENTS.md and TESTING.md; package autobyteus-web/AGENTS.md and autobyteus-server-ts/AGENTS.md; no closer applicable TESTING file. Package scripts/vitest configs, docs/isolated-app-instances.md, existing runtime E2E helpers and IMP-20 instructions define execution. No instruction conflict. Use current task-local package, clean env and private HOME/CODEX_HOME/data/ephemeral ports; no paid inference or credentials required for deterministic fixture. Preserve SDK dist build prerequisites. One heavy run at a time, stage explicit paths, never installed app/data, never arbitrary PID/port cleanup.
Commands: pnpm via `npm exec --yes --package=pnpm@10.28.2 -- pnpm` when absent; repository vitest paths; isolated-app start --from-worktree, returned controlPort only, preload normal quit/restart, canonical stop/list for cleanup. Readiness via actual HTTP/GraphQL/WS plus renderer. Full host uses existing Studio runtime helper/public standalone start. Fixtures use unique receipt paths, captured children and real PID/port checks. Cleanup only exact created instances/children/roots; retain evidence. Actual Windows/WSL unavailable; emulation not certification.

## Existing durable coverage inventory / validity
| Paths | Assertions / authority | Decision / action |
|---|---|---|
| autobyteus-ts/tests/unit/tools/terminal/**; agent/context/agent-config.test.ts | Retained anchor, verified absence/unknown, timeout/output/capture, config reference, CR-001/002; AC-004/005 | Still Valid; reuse IMP-23/25, no obsolete raw-PGID tests restored |
| server tests/unit/agent-execution/{agent-provider-factory-builder,backends/autobyteus/**}, compositions/**, startup/**, shutdown/**, server-runtime-app-data-migration-gate, standalone-application-host-lifecycle | Scope injection/early close; fault aggregation/startup cancellation/IPC. Standalone lifecycle uses mocks; real Fastify helper is not full Studio. AC-004/005 | Still Valid; reuse IMP-27; add integrated evidence |
| web electron/{server,application,updater}/__tests__ | Bind/error inspection, current generation, actual read-only listener, captured child Windows/force, quit/update ordering without install; AC-001..005 | Still Valid; reuse IMP-28; mock gap explicit |
| web components/server/__tests__ | Safe interpolation, locales/loading/monitor; AC-001..003 | Still Valid; reuse IMP-29; desktop journey still required |
| server integration native backend factory / runtime configured-skill E2E | Existing real factory tests use independently created scope; do not prove host owns it | Still Valid; not substitutes for composed host |
| evidence/P-001..011 and IMP-20 | Baseline defect/feasibility and older desktop | Out Of Scope as current acceptance; fixture recipes only |

## Planned Cases
| ID | Criteria | Kind / boundary | Plan / rationale |
|---|---|---|---|
| API-01 | AC-002/004/005 | Reused repository | IMP-23,25,27,28,29 plus type/build26,30,31. `git diff --name-only d0338db0b HEAD` contains ticket docs/evidence only; headers/result lines inspected. No duplicate suite reruns. |
| API-02 | AC-004/005/006 | Durable host lifecycle | Full Studio native active/ended/adopted/TERM-resistant commands through normal tool runtime and close; exact absence + unrelated/data sentinel. Add durable host regression if fixture is reusable. |
| API-03 | AC-004/005/006 | Durable host lifecycle | Full standalone native work and public close; same isolation/absence contract. |
| API-04 | AC-004/005/006 | Journey desktop | Actual Codex conversation exec_command yielded listener, completed turn with live work, normal full desktop quit/restart. Local deterministic SSE substitutes inference only; no standalone client.close shortcut. Temporary ticket probe justified for version-specific real CLI+desktop evidence; no product hook. |
| API-05 | AC-001/003/006 | Journey desktop | Current build actual UI conflict after owned backend exits; retry fixture remains426; release only fixture then retry healthy, no stale diagnostic/reset, sentinel preserved. Temporary isolated system orchestration. |
| API-06 | AC-004/005/006 | Journey desktop | Native active/ended initiating run/adopted work and TERM resistance through full desktop restart/quit; real listeners/PIDs and sentinel. |
| API-07 | AC-005 | Temporary executable transport | Real packaged Electron Node IPC/backend result+exit, failure/startup controls; reuse deterministic Windows force/updater cases (no install). Needed only where API-01 leaves actual transport gap. |

## Durable changes / missing proof decisions
Add durable host lifecycle coverage (API-02/03) after fixture feasibility; retain standalone/Codex desktop automation as ticket evidence unless a stable reusable repo surface is demonstrated. No removals/updates currently planned. Each uncovered integrated behavior above: Add Durable Coverage or Use Temporary Executable Probe Only as specified. Full Windows/WSL: Not Testable In Scope on macOS, not user-only acceptance; report exact limitation, never certification. Delivery merge/verification deferred to Delivery, not test success.
Progress log required. Any concrete provider ownership failure routes failure-origin review; no scanner, PID heuristic or ordinary-agent policy change. Initial decision: proceed; no reroute before execution.

## Pause / scope update — 2026-10-26T05:05:08.960871+00:00
Testing paused explicitly by user via Code Reviewer. API-01/04/06 completed before pause; all other planned cases not started. No complete validation result or API-REV entry yet. Solution Designer is authoring approved same-ticket read-only Codex background visibility expansion; this initial R1 plan is not authority for expanded UI tests. Resume requires current upstream package and direction. Existing whole-desktop native proof may reduce duplicate Studio probing, but durable regression decisions remain unfinished.
