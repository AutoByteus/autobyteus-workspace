# FAPI-007 — Actual recursive helper-Team cleanup fails and exact retry stays failed

## Authority / supported scenario
Approved REQ-BL-008 / SD-AP-001(SR-007)+scoped SD-AP-002, SR-014 / ARCH-REV-005; IR-006 / CRR-007 source Pass. Large / High / Reviewed unchanged. API-010; SCN-005/006/008; AC-007/008/011/015. Task-owned helper Team brought in by a Task worker is a supported ownership cascade, not unsupported vendor sessionStore, not a product requirement gap. Explicit user DONE is valid without a guaranteed worker completion report; no new completion/report/poll/timer convention is required.

## Exact execution mode
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`, branch codex/project-task-manager-linked-delegation, HEAD/base806907faeb567d2b703e10fe984fcd01be0b41fd. Independently `pnpm --silent isolated-app start --build`; own iso-65323-9445, control65323/backend65324. User-authorized exact `.env` source only through documented importer into own DB, exact own restart. Actual Codex gpt-6.1-sol low and native-MCP tools, public GraphQL definitions/Org launch/multipart saved Task contexts/normal Org WebSocket SEND_MESSAGE; no source hooks, mocked model/Task persistence, secret value read, new hidden override, prototype patch or global Stop.

Normal Org root launch: default W1 workspace for Manager/other Task; configured Workers Team has normal teamOverrides W2. Saved Task A is delegated as a fresh COPY of /workers; original configured Team remains unactivated. Actual Team coordinator reads saved packet, messages its configured reader, delegates one unlinked Leaf and brings in one catalog helper Team through send_message_to. Its helper coordinator reads packet and messages its configured reader. Five actual successful native read results are recorded; assignment/delegation/helper stamps carry the same lifetime. Catalog-derived Leaf/helper Team use current root-default W1, not caller Team W2: do not infer all five use an exclusive provider.

Commands in W (exact commands and timestamps also in logs/ledger):
- `node tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/round5-physical-recursive-probe.mjs` — exit1; `api-010-round5-physical-recursive.log`.
- `node tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/round5-failed-helper-retry.mjs` — exit1; `api-010-round5-failed-helper-exact-retry.log`.
- Read-only witness: `python3 tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/round5-failure-witness.py` — exit0, not acceptance.
These scripts intentionally verify the recorded ephemeral instance identity. That own instance is now removed; reproduction requires a newly owned documented launch/import and new receipts/fixture namespace, not replay against the user's app or stopped endpoint.

## Exact identity / timeline
- Root Org `api005_physical_org_a67967e3_3aba_480f_93f7_859b932cf6a7_d557d5ae7531415a9955f65ed1bd4e56`.
- Manager `project_task_manager_0b51352866a9413eb487d3ec3a1ebf2c`.
- Project `project_02025d18-9aa5-4d42-b7a5-cce334d5382f`.
- Task A `project_task_a040bd83-43d7-45a4-9e72-a2cbc6b02f0d`; lifetime `project_task_lifetime_61ff437a-57be-422c-a5d8-cfbad1396921`, opened13:57:12.950Z, completed13:58:17.394Z on2026-10-03.
- Assignment Team `api005_physical_workers_67b93cc2dbdd43849e6e713c6853947f` → released.
- Further unlinked Leaf `api005_physical_leaf_1f2c647f2a4148c7a360246ef2bcfc39` → released.
- **Helper Team** `api005_physical_helper_team_92afdfb505fc465e981dec5a31ae6085`; ingress `api005_physical_helper_coordinator_ec5b637d0e034840b447f0f7f495966d`; purpose helper; reserved13:57:39.893Z; dispatch delivered → **cleanup failed / TASK_RELEASE_FAILED / Exact Task execution cleanup failed.**
- First explicit normal Manager DONE: all-released observation times out120s at14:00:10Z. Failure is already persisted, not merely the absence of a frame.
- Retry starts14:02:26.741Z. Actual Manager turn `01a10212-c63b-70f2-89a4-5c2cafad64d9`, one `create_or_update_task` call `exec-7c8ccb27-a41f-4c59-a4bd-f41b9e5ad27b`, compact business acknowledgement at14:02:34.159Z, then business list and real assistant SEGMENT_END with unique marker. Retry all-released observation times out120s at14:04:27Z. Same failed helper/lifetime/completion/root/execution/ingress/reservation/dispatch and durable tree retained. No new copy, initial seed or admission authority.

## Expected / observed / limits
Expected: platform releases every exact Task-owned assignment/further worker/helper-Team member, retains truthful failure/proof and safe exact retry, protects Manager/root/B/borrowed work, history/packets/workspaces. A business DONE acknowledgement is not physical stop proof.
Observed: DONE business status and closure commit correctly; one helper link remains failed both before and after exact retry. Generic aggregate does not expose the underlying exception, so cause/final owner remain **Unclear**. The failure cannot be waived because the business status succeeded or a reconnect snapshot is offline.

Physical witness: predispatch no W2 provider; actual open W2 Codex app-serverPID69612 and seven captured native descendants69704/69705/69743/69923/69924/69997/72402. **All eight physically absent** after first attempt and final retry sample; no W2 provider at final sample. Protected W1 app-serverPID68061 survives while Manager/root remain usable. Shared W1 retention is neither a leak nor full helper physical-release proof.

First captured stream has genuine offline events for assignment reader, Leaf, helper reader (two observations), assignment coordinator; no captured helper coordinator offline. **Retry initial reconnect snapshot already shows helper coordinator offline.** Therefore this is not proof that it stayed active, not a forced-icon issue, and not a demonstrated orphan process. Current Task B later naturally offline is not evidence of A wrong-scope stop: B lifetime stays OPEN/not_requested and protected shared provider/root/Manager retained. No projection errors captured.

Saved descriptions/context bytes, exact run IDs and internal tree/history/workspaces/sentinels remain unchanged; actual business list contains two non-helper A references and one B reference, excludes helper internals, and mutation result only three business facts. No Manager cleanup lesson or fabricated released response.

Read-only source spine inspected: RootTaskLifetimeScope aggregates controls.release / adapter.releaseOwnedExecution faults into TASK_RELEASE_FAILED; ProjectTaskRuntimeRelease retries outstanding exact references; Org adapter already uses managed Team handles, not an assumed active-only lookup. No confirmed provider/codec/definition/schema/decoder fault. Selected own runtime-log extract is empty and supplies no causal attribution. Request focused reviewer origin/actual owner; not implementation rework on a guessed cause, design policy, successful-test review or Delivery.

## Evidence / safety
Primary `api-005-physical-recursive.json`, `api-005-failed-helper-retry.json`, `api-005-fapi-007-witness.json`, `api-005-physical-retry-current-inspection.json`, full exact logs/probes and own raw history in `api-005-owned-history/`. Original FAPI-006 first LIVE two-offline sidebar case separately scoped-resolved in `api-005-done-b.json/png` and `api-017-round5-live-done-b.log`, not reopened by this different recursive scenario.

Final283/283 current source/template/test/SDK hashes unchanged; no source/durable-test correction this round.47 allowlisted own history/Project/packet files archived, no DB/vault/key/env. Exact documented own stop graceful/forcedfalse; own data root+imported DB/root key and ports removed, all78 own captured PIDs absent, other4 instance records exactly unchanged. This final environment cleanup does **not** repair the failed Task acceptance.
