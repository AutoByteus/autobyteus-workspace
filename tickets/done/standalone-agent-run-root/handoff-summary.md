# Handoff Summary — standalone-agent-run-root

## Classification And Route

- `task_size=Large`, `architectural_risk=High`; reviewed route (Architecture Review → Code Review → API/E2E → test-code review).
- Gates: ARCH-REV-004 Pass; CRR-006 Pass (9.3/10) and CRR-008 Pass (IR-005); API-REV-004 Pass (93%); CRR-007 / CRR-009 Not Applicable (API/E2E changed no durable tests).

## What Changed

- **REQ-001:** `src/agent-run-collaboration/` replaced by `src/standalone-agent-run-root/`. `StandaloneAgentRunRoot` owns the host (through `StandaloneHostAgentHandle`), collaborators, task copies, messages, lifecycle and package. `agent-execution` reaches it only through `StandaloneRunCommandPort` / `StandaloneRunLifecyclePort`.
- **REQ-002:** Team-root collaborator agents moved to `TeamRootCollaboratorAgentRegistry` (no longer in `memberContexts`).
- **REQ-003:** the Org root (Org message delivery extracted) and the standalone root are each under the file-size limit. `agent-run.ts` is at 498 effective lines.
- **REQ-004:** standalone self-delegation is rejected with `COLLABORATION_SELF_TARGET_REJECTED`.
- **REQ-005:** inter-agent deliveries carry `sender address: <address>`.
- **REQ-006:** `getStandaloneRunTokenUsageSummary` rolls up children; Token Meter uses it.
- **REQ-007 / REQ-008:** "From <Sender>:" on the Event Monitor's earlier-events page; host label in readable format.
- **REQ-009:** both suites green, root causes recorded.
- **SR-006 § 11 (F-02):** the root shutdown fence waits for quiescence after a rejected interrupt.
- **IR-005 (DR-001):** `test-support/native-input-history` import points at the moved fixture.

## Integration State

- Branch `codex/standalone-agent-run-root` in `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root`.
- Merged `origin/personal@1b9739cad` (merge `1195f4356`; Merge method). Re-fetched in DR-002: base unchanged. After user verification (DR-003), re-merged `origin/personal@852ea5327` (`3e8d4eeac`); checks rerun with 0 new failures; no material change to the verified state.
- Post-integration checks: see `release-deployment-report.md`. Summary:
  - server typecheck clean (TS6059 noise only);
  - targeted server suites: 0 new failures against base;
  - Claude, fence and termination tests: 244/244;
  - ticket web specs: 126/126;
  - `pnpm test:native-input-history`: 2/2 (rerun by delivery in DR-002);
  - API-REV-004: full server and web show 0 new failures.

## Docs

- `docs-sync-report.md`: TESTING.md path fix; new "Root Shutdown Fence" subsection in `agent_execution.md`; module docs from implementation verified.

## Residual Risks For User Verification

1. CG-05: the standalone Token Meter refreshes children-only usage on the next host report or when the panel reopens.
2. `agent-run.ts` is at 498 effective lines, just under the limit.
3. Grok is unreliable in this environment, and LM Studio was not run.
4. The fence's live rejection → quiescence path is unit-proven only; LE-O1 on Codex passed 11/11 after the fix.
5. The configured-Team member earlier-events page was not driven live.
6. Upstream live-model mention flakiness reproduces on `1b9739cad` alone; it is not from this branch.

## Suggested User Checks

- In a standalone agent run, `@`-mention a shared Agent and a shared Team, and exchange messages. Confirm the sender address appears and replies by address work.
- Open the Token Meter for that run and confirm the total includes collaborators after the next host report.
- Open a collaborator's Event Monitor earlier-events page and confirm "From <Sender>:" appears.
- Stop the standalone run and an Org run, reopen history, and confirm both restore.
