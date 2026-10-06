# API/E2E Test-Case Ledger

## Ledger Meta
Initial API-REV-001; same canonical workspace/ticket as coverage investigation. Multi-case + long-running live execution. Report/revision not yet complete; not implied Pass.

## Planned Cases
| ID | Case | AC | Result |
| --- | --- | --- | --- |
| A01 | Focused current units | AC-007/008/009 | Pass |
| A02 | Unsuppressed positive native control | AC-006/009 | Pass |
| A03 | Production default + private enabled file | AC-006/007/009 | Pass |
| A04 | Conflicting custom string arguments | AC-006/007/009 | Pass |
| A05 | Conflicting custom JSON arguments | AC-006/007/009 | Pass |
| A06 | Old-source native oracle intentional red and restored green | AC-009 | Pass |
| A07 | Serialized current production build and coverage checks | AC-008/009 | Pass |
| A08 | Bounded current-built-system inventory/MCP/create/stop/restore | AC-006/008/009 | Pass |

## Execution Events


- A01 Started: six current-source units; no concurrent build/test DB user.

- A01 Completed: exit 0; see evidence/api-e2e/api-001/units.log.

- A02–A05 Started: explicitly gated no-auth native captures; every case emits receipt before next.

- A02–A05 attempt completed: exit 0; exact per-case receipts in native-green/.

- A02 Completed Pass: six collaboration declarations and both native tags present; ordinary five present; all cleanup true.
- A03 Completed Pass: production default manager, enabled private file defeated; no native tools/tags, ordinary five retained; all cleanup true.
- A04 Completed Pass: string enabled conflict defeated, all cleanup true.
- A05 Completed Pass: JSON enabled conflict defeated, ignored invalid string, all cleanup true.
- A06 Started: controlled old-source substitution, native outcome oracle expected red; original source protected and restored by finally.

- A06 checkpoint Pass (intentional red): old source 1 control passes / 3 treatments fail on actual collaboration definitions; source restored byte-exact, all cleanup true. See native-red.log, native-red/, red-provenance.json. Restored green pending.

- A07 Started: serialized current shared prebuild and production build (source restored).

- A07 build completed exit 0; evidence/api-e2e/api-001/{prebuild,build}.log.

- A02 Completed Pass 2026-10-06T15:54:45.424Z: positive-control, native tools=6, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-restored-green/positive-control.json.

- A03 Completed Pass 2026-10-06T15:54:45.605Z: production-default, native tools=0, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-restored-green/production-default.json.

- A04 Completed Pass 2026-10-06T15:54:45.787Z: custom-string, native tools=0, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-restored-green/custom-string.json.

- A05 Completed Pass 2026-10-06T15:54:45.960Z: custom-json, native tools=0, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-restored-green/custom-json.json.

- A06 Completed: restored-source native run exit 0; compare intentional red receipts; original policy outcome restored.

- A08 Started: gated current-built Studio/public Team/WS model inventory and MCP/Stop/restore; private auth copy authorized by SR-004/005, two bounded model turns max.

- A08 Checkpoint 2026-10-06T15:55:08.746Z: owned built Studio ready (not terminal).

- A08 Completed Fail 2026-10-06T15:55:08.945Z: Error: Owned system failed: {"model":"gpt-6.1-sol","inventories":[],"phases":["owned built Studio ready"],"cleanup":{"studioClosed":true,"clientsClosed":true,"publicListenerReleased":true,"errors":[]},"result":"Fail","error":"AssertionError [ERR_ASSE; cleanup {"binaryVersion":"codex-cli 0.160.1","childExited":true,"exitCode":1,"signal":null,"privateRootAndAuthRemoved":true,"sourceAuthUnchanged":true,"sourceConfigUnchanged":true}; see /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/system-attempt-1/system.json.

- A08 Checkpoint 2026-10-06T15:55:54.439Z: owned built Studio ready (not terminal).

- A08 Checkpoint 2026-10-06T15:56:09.420Z: fresh: completed inventory (not terminal).

- A08 Completed Fail 2026-10-06T15:56:09.603Z: Error: Owned system failed: {"model":"gpt-6.1-sol","inventories":[{"phase":"fresh","runId":"native_policy_manager_7478ea34b530452e968042620382ab7f","threadId":"01a111ed-b9a8-79a2-8acd-dbd377d491ff","model":"gpt-6.1-sol","argv":["app-server","-c","age; cleanup {"binaryVersion":"codex-cli 0.160.1","childExited":true,"exitCode":1,"signal":null,"privateRootAndAuthRemoved":true,"sourceAuthUnchanged":true,"sourceConfigUnchanged":true}; see /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/system-attempt-2/system.json.

- A08 Checkpoint 2026-10-06T15:57:05.954Z: owned built Studio ready (not terminal).

- A08 Checkpoint 2026-10-06T15:57:19.146Z: fresh: completed inventory (not terminal).

- A08 Checkpoint 2026-10-06T15:57:19.211Z: ordinary Stop physically closed first Codex generation (not terminal).

- A08 Checkpoint 2026-10-06T15:57:25.702Z: restored: completed inventory (not terminal).

- A08 Checkpoint 2026-10-06T15:57:25.770Z: same saved identity, new client, restored MCP callable and final Stop complete (not terminal).

- A08 Completed Pass 2026-10-06T15:57:25.910Z: two inventories/MCP/identity/physical closes passed; cleanup {"binaryVersion":"codex-cli 0.160.1","childExited":true,"exitCode":0,"signal":null,"privateRootAndAuthRemoved":true,"sourceAuthUnchanged":true,"sourceConfigUnchanged":true}; see /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/system-attempt-3/system.json.

- A07 final tests Started: final current six unit suites + native cases, sequential after live system completion; no shared-output builds running.

- A02 Completed Pass 2026-10-06T15:58:12.087Z: positive-control, native tools=6, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-final-green/positive-control.json.

- A03 Completed Pass 2026-10-06T15:58:12.255Z: production-default, native tools=0, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-final-green/production-default.json.

- A04 Completed Pass 2026-10-06T15:58:12.383Z: custom-string, native tools=0, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-final-green/custom-string.json.

- A05 Completed Pass 2026-10-06T15:58:12.575Z: custom-json, native tools=0, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-final-green/custom-json.json.

- A07 final repository Completed: exit 0; final-repository.log.

- A02 Completed Pass 2026-10-06T15:58:36.346Z: positive-control, native tools=6, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-final-red/positive-control.json.

- A03 Completed Fail 2026-10-06T15:58:36.561Z: production-default, native tools=6, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-final-red/production-default.json.

- A04 Completed Fail 2026-10-06T15:58:36.732Z: custom-string, native tools=6, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-final-red/custom-string.json.

- A05 Completed Fail 2026-10-06T15:58:36.899Z: custom-json, native tools=6, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-final-red/custom-json.json.

- A06 final-test intentional red reproduced: 3 failures on native declarations / 1 positive pass; real lease reuse/cleanup succeed; source restored exactly. This is regression-oracle proof, not a product failure.

- A02 Completed Pass 2026-10-06T15:58:38.307Z: positive-control, native tools=6, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-after-final-red-green/positive-control.json.

- A03 Completed Pass 2026-10-06T15:58:38.460Z: production-default, native tools=0, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-after-final-red-green/production-default.json.

- A04 Completed Pass 2026-10-06T15:58:38.602Z: custom-string, native tools=0, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-after-final-red-green/custom-string.json.

- A05 Completed Pass 2026-10-06T15:58:38.751Z: custom-json, native tools=0, cleanup errors=0; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/evidence/api-e2e/api-001/native-after-final-red-green/custom-json.json.

- A06 final restored green Completed: exit 0; no source diff and final byte-identical production policy.

## Re-entry And Reconciliation
A01 final 62 unit cases: Pass. A02–A05 final native cases: Pass. A06 latest intentional red/native-outcome proof: Pass, then restored green: Pass. A07 serialized build/syntax/test-diff/final 66 repository cases: Pass. A08 final actual system: Pass (two completed inventories). Retained attempt 1 setup and attempt 2 oracle issues resolved in attempt 3. No unresolved, running or unstarted planned case. Ledger reconciled into canonical execution report/API-REV-001: Pass, 95.83%. No prior API round. Raw controls/failures are not product failures. Cleanup complete before handoff; user/full desktop/deployment verification remains Delivery-owned.
