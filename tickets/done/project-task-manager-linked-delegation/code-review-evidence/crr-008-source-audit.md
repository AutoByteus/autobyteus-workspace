# CRR-008 bounded failure-origin source audit
This is not a full implementation-source audit or successful-test-code review.
Approved actor/event: ordinary Manager saved Task explicit DONE/repeated DONE after transitive worker/helper work (SCN-005/006/008, AC-007/008/011/015).
- projects/services/project-task-service.ts:111–116 — closure plus release effect even when business status already DONE.
- projects/runtime/project-task-runtime-release.ts:23–48 — outstanding references, exact root, settled retry-latch deletion, persisted truth.
- agent-collaboration/execution/task/root-task-lifetime-scope.ts:59–91 — canceled controls/physical authorities; independently started proof; nested reasons reduced to generic TASK_RELEASE_FAILED. Inner rejected proof not archived.
- agent-org-execution/services/agent-org-task-execution-adapter.ts:99–190 — actual host plan/seedless helper registration and managed release lookup, not active-only cleanup.
- agent-collaboration/execution/backends/root-team-execution-directory.ts:145–233 — committed live gate preserved; controls plus managed Team runtime release retained; no premature unpublished abort.
- agent-team-execution/local/flat-team-execution-factory.ts:127–195 — published/private control, coalescing and retained failed authority.
- agent-team-execution/local/flat-team-execution-manager.ts:147–160/258–272 — statuses excluded for non-active lifecycle; release sets terminating before exact proof; independent releases and success-only disposal.
- agent-org-execution/services/agent-org-agent-status-snapshot-projector.ts:24–48 — active directory traversal + dormant durable fallback offline. Does not certify per-thread resources.
- agent-team-execution/local/flat-team-agent-execution-handle.ts / configured-agent-execution-handle.ts:210–233 — exact local handles delegate to managed AgentRun.
- agent-execution/services/agent-run-manager.ts:319–335 / runtime/agent-run-activation-registry.ts / services/agent-run-resource-manager.ts — exact published/retired/released authority, provider release plus independent attachments, retained errors/generation safety.
- agent-execution/domain/agent-run.ts:122–126/486–501, input/agent-run-input-admission-state.ts:430–434 — forced close uses backend proof then input-settlement assertion. Relevant hypothesis only; no accepted backend/attachment proof or corresponding thrown fault captured for actual helper coordinator.
- Codex backend/thread manager/release scope — backend false receipt vs thrown AgentRun/attachment fault distinguishable only with inner evidence; exact thread/turn/lease proof, no global Stop. Actual hidden provider payload not available; no codec or provider defect asserted.
Independent prior actual closure read: original FAPI-006 events656/657 before reload repair, not full physical matrix.
Read-only actual helper evidence: first/retry persisted failed same exact helper; raw Manager one real status call/ack/final; five actual packet reads/stamps; original empty runtime extract; helper forwarded entry at2157/2159, offline reconnect is fallback-compatible.
No new test/probe/provider run: the missing actual inner witness cannot be supplied by an invented accepted-stop fake. Gate holds attribution, routes Unclear; no finding or forced recovery machinery.
