# Handoff Summary — cross-node-agent-communication (autobyteus-191, slice 1: remote delegation, text only)

Status: **verification open** (DR-001). Integrated, docs synced and checked; not finalized. Two open items: your AC-113 check, and an RC-10 test race that has been sent back to API/E2E.

## Ticket

- Package: `cross-node-agent-communication`, Project Task `autobyteus-191`, slice S1 of `slice-plan.md`. An agent on one node delegates a text task to an Agent another node publishes, and the two runs message each other by run ID, also after idle shutdown and restarts. Trusted private network only: no authentication between nodes, and no credential crosses them.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed:
  - architecture review ARCH-REV-002 … ARCH-REV-007, Pass;
  - code review CRR-006, Pass;
  - API/E2E API-REV-003, Pass, 95%;
  - test-code review CRR-007, Pass.
- Revisions: SR-001 … SR-017, ARCH-REV-001 … 007, IR-001 … IR-004, CRR-001 … CRR-007, API-REV-001 … 003, DR-001.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2`, branch `codex/cross-node-agent-communication-r2`; finalization target `origin/personal`.

## What Changed

- **Server, `src/remote-collaboration/`:**
  - **Node settings:** the switch `ENABLE_REMOTE_COLLABORATION` (off by default), peer nodes pinned by server identity, and published Agents with their launch settings.
  - **`PeerClient`:** the outbound client. It has a 20 s bound, checks that the answering node is the pinned peer, and words every refusal for the agent with the peer's name.
  - **`PeerGateway`:** the one inbound entry point, for `POST /rest/remote/delegated-runs` and `/rest/remote/messages`.
  - **Two receivers:** one prepares the published Agent's run, the other routes incoming messages to the right run.
- **Shared remote component, `src/agent-collaboration/execution/remote/`:** remote endpoint kinds, `RemoteRunLinks`, `RemoteMessageSend` and `RemoteDelegation`. The standalone, Team and Org roots all use it, both to delegate and to message.
- **On disk:** a tree link with `nodeId` in the delegating root, and `delegatedFrom` in the remote run's `run_metadata.json`. The receiving node's run is an ordinary standalone run with idle shutdown.
- **Tool:** `delegate_task` takes `node`. Refused across nodes for now: files (`reference_files`) and saved Tasks (`task_id`).
- **Task closure** fences a remote run (`fenced_remote`).
- **Views:** messages with a remote endpoint are kept out of the root views, with no sequence gaps.
- **Package validators:** the Team and Org validators accept remote message endpoints (SR-017).
- **Web:** a Nodes → Remote Collaboration tab, in en and zh-CN.
- **Tests:** the new gated two-server E2E `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (20 cases), plus unit tests.
- **Docs:** see `docs-sync-report.md`.
  - The implementation already carried `remote_collaboration.md` (new), `collaboration_model.md`, `agent_tools.md`, `standalone_agent_run_root.md` and `autobyteus-web/docs/settings.md`.
  - Delivery added the package-admission rule to `remote_collaboration.md` and the remote link to `agent_team_execution.md`.

## Integration

- `origin/personal` had advanced from `5de6a698b9` to `3b2c86ca9e`:
  - settings-update-notifications;
  - runtime-lifecycle-review;
  - mcp-http-error-status;
  - repository-secret-scan;
  - the `1.5.8-beta.2` and `beta.3` bumps.
- **Checkpoint:** the code reviewer's three uncommitted review documents were committed first (`770715dfa8`).
- **Merged into the ticket branch** (`4f03cce09d`):
  - One conflict, additive: `server-settings-service.ts`. Each side registers a new setting (`ENABLE_REMOTE_COLLABORATION`, `ENABLE_UPDATE_CHECKS`), and both are kept.
  - Auto-merged overlaps, all additive: `schema.ts`, `build-studio-server.ts`, `autobyteus-web/docs/settings.md` and the en/zh-CN catalogs.
- **Rerun on the merged state** after `pnpm install` and server prebuild. Evidence is in `evidence/delivery/`.

| ID | Command | Result | Evidence |
| --- | --- | --- | --- |
| DEL-01 | `pnpm -C autobyteus-server-ts typecheck` | Pass, exit 0 | `DEL-01-server-typecheck.log` |
| DEL-02 | web `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Pass | `DEL-02-web-guards.log` |
| DEL-03 | `pnpm -C autobyteus-server-ts test:unit` | 6387 passed, 7 skipped, 1 failed. The failure is `team-member-run-view-projection-service.import.test.ts`, a 5 s timeout on a cold import. It fails identically at the default timeout on `origin/personal` alone and on the pre-merge branch, and passes everywhere with a longer timeout (6.5–8.9 s). Load average was about 95. Pre-existing: FU-006. | `DEL-03-server-unit-full.excerpt.log`, `DEL-03b-import-timing-bisect.log` |
| DEL-04 | `pnpm -C autobyteus-web test:nuxt` | Pass, 651 files, 4639 passed, 5 skipped | `DEL-04-web-unit.excerpt.log` |
| DEL-05 | `pnpm -C autobyteus-server-ts build` | Pass, exit 0; bootstrap smoke checks passed | `DEL-05-server-build.log` |
| DEL-06 | two-server E2E (API/E2E command, clean env) | 19/20. RC-10 failed at `receives(remote, "PROJECT-PACKET")`: beta's `getRunProjection` answered "Run package … is unavailable" for the remote run the test found by scanning beta's run folders, and the test's `until` helper fails on a thrown error instead of retrying. Sent to API/E2E as a race in the test. | `DEL-06-two-server-e2e-run1.log`, `DEL-06-run1/remote-two-server-receipt.json` |
| DEL-07 | the same, rerun | Pass, 20/20, at load average 130–157. RC-06/07 `gaps: []`; RC-10 `role: delegated`, `TASK_AGENT_RESOURCE_CLOSED`; RC-13 Team/Org `inAlphaLog: true`; RC-20 header names unchanged; cleanup clean | `DEL-07-two-server-e2e-run2.log`, `DEL-07-run2/remote-two-server-receipt.json` |

## Verification

- **Judged from the evidence:** every critical acceptance criterion except AC-113 is directly proven (see `release-deployment-report.md` § Verification). The proof comes from API-REV-003's receipts and screenshots and from DEL-07 on the integrated state.
- **AC-110 evidence defect (non-blocking):** the two API-23 screenshots are the same file (identical MD5). The composer message and Stop are proven by the DOM text and server state recorded in `API-23-browser-journey.log` ("OWNER-COMPOSER-MSG" in beta's projection; `status: ["Offline"]`, 0 live processes after Stop), not by a second screenshot.
- **AC-113 needs your check.** It is the desktop node and a Docker node, set up in the node windows, running AC-104 … AC-106 in both directions with real runtimes. API/E2E tried a test-owned Docker node (API-24) and TESTING did not allow it: the published image differs from this branch in 31 unrelated files. The check needs your desktop, nodes and runtime sign-ins.
- **RC-10 test race** (DEL-06): sent to API/E2E. The product path passed in DEL-07 and in API-REV-003's four runs.

## Release

- Not decided yet. `RELEASE.md` defaults to finalize only. A beta (`1.5.8-beta.4`) is one way to give AC-113 a desktop build and a Docker image that contain this change; that is your decision.

## Residual Risks And Follow-ups

- RSK-106: messages between nodes are at-most-once, with no retries. A timeout is ambiguous ("may have been delivered"). Accepted for slice 1; FU-002.
- RSK-103: a node's identity is claimed, not proven, until S6 adds authentication. The feature is for a trusted private network only, and the switch is off by default.
- Follow-ups in `follow-ups.md`, sent by the Solution Designer:
  - FU-002, reliable delivery;
  - FU-003, a stale DLC suite;
  - FU-004, a migration that imports the current Org validator;
  - FU-005, a Task race timeout that also fails on the base. It was renumbered from a duplicate FU-004; the API/E2E and code-review documents call it "FU-004".
  - FU-006, the import-timing unit test.
- Not applied (optional, reviewer-marked): C-9 import ordering in `root-task-execution-lifecycle.ts`; the CRR-007 test-file notes.
