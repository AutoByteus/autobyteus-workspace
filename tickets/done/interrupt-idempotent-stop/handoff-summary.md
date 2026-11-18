# Handoff Summary

## Summary Meta

- Ticket: `interrupt-idempotent-stop` (Project Task `autobyteus-533`)
- Date: `2026-11-18`
- Classification: `task_size: Medium`, `architectural_risk: High`; route: reviewed (architecture review ARCH-REV-002 Pass; source review CRR-002 Pass after CR-001 fixed in IR-002; API/E2E `API-REV-001` Pass, final confidence 94.6 %, no category below 90 %; test-code review CRR-003 Pass, no findings).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/interrupt-idempotent-stop`, base `origin/personal` `bd2053ee51` at bootstrap; integrated once with `origin/personal` `53b72018ad` (98 commits, clean except one documentation conflict, merge `ac410ad30b`). Product code is final at `71f9a5d13e` (IR-002); test code at `6744d786c6`.

## Delivery Summary

- Delivered scope:
  - **A Stop that finds nothing to stop is accepted** on all five streams that take it (`/ws/agent`, `/ws/agent-team`, `/ws/agent-org`, `/ws/agent-collaboration`, `/ws/peer-run`): the run has no turn, its turn ended in the runtime before the interrupt arrived, or the run, Team or Org is not running. One rule, `userInterruptOutcome`. The Claude, Codex and native backends answer `NO_ACTIVE_TURN` when the turn is gone. A malformed command or a target that is not a member stays rejected; the domain `AgentRun.interrupt()` result is unchanged for termination and the shutdown fence.
  - **One owner of a Stop in the web**, `runInterrupt`, for every run kind on desktop and phone. After the first press the button shows a spinner and "Stopping…" (disabled, `aria-busy`) and sends one Stop; it returns to Send or Stop when the run's status changes. Nothing is shown for an accepted Stop. One plain message that names the agent as the view does ("Could not stop <name>. Please try again." / "Stop was not sent: not connected to the node. Check the connection and try again.") shows only for a Stop that was not sent or was refused (en, zh-CN).
  - **A Stop whose connection is lost** is held by the streaming service until the rebind's status arrives, so the page never shows a false failure for a Stop that most likely worked (`InterruptsAwaitingRebind`; a final close settles at once).
  - Removed: the streaming services' per-result toasts, `teamRunCommandPresentation.ts` (now `teamRunCommandIds.ts`), the two scratch reproductions.
- Docs synced (`docs-sync-report.md`): `agent_websocket_streaming_protocol.md` and `agent_execution_architecture.md` (by the ticket), `agent_execution.md`, `agent_integration_minimal_bridge.md` and two passages of `agent_execution_architecture.md` (by delivery, stale after the change), `docs/design-cases.md` (one case bullet). `DESIGN.md`, `TESTING.md`, `RELEASE.md`: no change.
- Durable coverage: server `stop-nothing-to-stop.e2e` (idle run, double Stop at 0/50/250 ms, a Team member), unit tests per handler, backend and the rule; web `runInterrupt`, `orgInterruptOutcome`, the composer's Stopping journey, streaming services, stores and the catalog; browser probes `stop-generation-probe.mjs` (`pnpm -C autobyteus-web test:e2e:stop-generation`; desktop, loopback and `--latency-ms`), `MSP-80…84` in `test:e2e:mobile-shell` (phone, every run kind; API/E2E ran them as MSP-75…79, renumbered by delivery because the merged base took those IDs), and the fixture probe `interrupt-result-presentation`.

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-001…AC-011, QR-001, QR-003) is directly proven; AC-005 by unit tests only (live paid runtimes not run), which the requirements named as its proof ("server unit per backend that can report it"). Nothing needs the user's check.
- Final confidence 94.6 % against the 95 % target: the gap is the machine (load 40–80 and broken FSEvents kept unrelated files from passing; each has its cause in the execution report), not an unproven criterion. Every Stop-related suite passes.
- Key evidence opened by delivery (details in `release-deployment-report.md`): `API-07` desktop loopback (8/8, one Stop per double press, `acks ["accepted"]`, no toast, `Stopping…`/`aria-busy` traces, refusals named "Stopper a202" and "lead"); `API-08` at 150 ms (8/8; Stopping across a drop, Stop offered again after a lost one); `API-09` (79/79 phone cases; MSP-75…79 (now MSP-80…84) for standalone, Team member, Org member, Org Team member, delegated agent and Team member, peer run on a second node; `nodeAnswers ["accepted"]` for a stale Stop on `/ws/agent`, `/ws/agent-team`, `/ws/agent-org`, `/ws/peer-run`); `API-10` (80 rounds, 0 with a toast or a second Stop, 30 second presses landed on "Stopping…"); `API-06b` `stop-nothing-to-stop` 2/2.
- Integrated-state check on the merged tree (`evidence/delivery/`): `autobyteus-ts` rebuilt, both typechecks at baseline (server 0 production errors, 1008 test-file errors in 315 files = baseline; web 0 and 87 in 37 = baseline), 32 server unit files / 304 tests and 48 web files / 523 tests for the Stop code pass, `agent-websocket` integration 8/8, server rebuilt, the real-stack desktop probe passes 8/8 on the merged build, and the phone cases pass on a rebuilt phone bundle beside the base's own `MSP-75…78` (`DEL-05`). The merge had given two sets of phone cases the same IDs, which the probe fails; delivery renumbered this ticket's cases to `MSP-80…84`.

## Residual Risks For The User

- **CG-06 (by design):** a Stop that arrives just as the runtime starts its next turn is accepted and does not stop that turn. The user presses Stop again.
- **R-3 / R-4 (by design):** "Stopping…" has no timer. It lasts until the run's status changes or the stream rebinds, so it can last while a node is unreachable (the page's reconnect backoff reaches 30 s).
- **Not tested:** live Claude, Codex and native turn-gone races (unit only); a refusal from a real runtime (emulated at the page's socket in the node's own answer shape; the node-side refusal is unit and integration proven); the Electron shell (unchanged); zh-CN rendered (catalog spec only); a physical phone.
- **Environment:** FSEvents broke 2 server folder-watcher integration files and 2 package-watcher E2E files; 2 in-process AGY E2E files time out in `afterAll` (also seen on another branch); `open-task-tree-upgrade-startup` OT-2 is stale on this base (its fix is on `codex/follow-ups-of-461-500`). None run the changed code.

## Follow-ups

- `follow-ups.md` lists FU-001…FU-008 for the Solution Designer to send (none sent yet). **FU-006 is urgent**: a message sent on a run stream that has just opened can be lost silently when the node has not bound the stream's session (`SESSION_NOT_READY`); seen 1 in 80 sends after a Stop (CG-07). Its Task should also turn the probes' one-time send retry into a failure. Others: FU-001 localize the Send/Stop labels; FU-002 the open-time `Running` placeholder; FU-003 dead branch in `team-tool-approval-command-handler.ts`; FU-004 CPU-bound spec timeout; FU-005 Team stream recovery after a path blip; FU-007 run-open race error; FU-008 whether a script-only `package.json` change triggers the Fresh-start build.

## Release

- No release: the user did not ask for one and `RELEASE.md` makes none the default. A release is available: `release-notes.md` holds the user-facing notes (no `## What you need to do`: no user action, no migration).
