# Handoff Summary — delegated-copy-member-contact-delegator

## User Verification

- Verified by the user on 2026-10-09: "the task is done. lets finalize and release a new beta". The user accepted after the API-REV-002 packaged desktop journey (DSK-001..004) and the DR-002 hold.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator`
- Ticket branch: `codex/delegated-copy-member-contact-delegator`, HEAD `01ab8b7de`. It is local and not pushed.
  - `24baaf7c5`: implementation (IR-001).
  - `73e871592`: delivery checkpoint, holding the durable E2E `delegated-copy-member-contact-host.e2e.test.ts` and the ticket artifacts.
  - `01ab8b7de`: merge of `origin/personal` @ `742a0df97`.
  - The working tree also holds the docs sync and delivery artifacts. These are not yet committed and are part of the verified candidate.
- Base and finalization target: `origin/personal`.
  - The bootstrap base was `a573465d9`. The latest base `742a0df97` is 35 commits ahead, mostly the base-test-suite-green ticket.
  - The merge was clean, and none of the base files overlap this ticket's files.
- Classification: `task_size=Medium`, `architectural_risk=High`. Route: reviewed, with ARCH-REV-001, CRR-001, API-REV-001 and CRR-002.
- Not to be committed: the untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` folders, and any server `dist/`.

## What Changed

- **Server** (`24baaf7c5`):
  - The standalone Agent root's collaborator port is now built per viewer (the focused or sending agent).
  - The host is always an in-run placement with rank `run_agent` at its host address. Its definition is the viewer's own only for the host.
  - The result: members of a delegated Team or Agent copy can `@` the host, and see it in `list_available_agents`. `send_message_to(<host address>)` reaches the existing host run.
  - The host never sees itself, `delegate_task` to the host is refused, and the host is never brought in or copied.
- **Contracts:** `MentionedCollaborator.inRun` became `presence` (`not_in_run` / `in_run` / `run_agent`).
  - A `run_agent` entry reads "the run's own agent", with the sentence `Use send_message_to with recipient_address <addr> to message <name>; delegate_task cannot target it.`
  - Notes saved by earlier releases still parse.
- **GraphQL:** `collaboratorMentionCandidates` gained `focusedAgentRunId`, required for Agent roots.
- **Web:** Agent-root mention scopes pass the focused agent (the host `runId`, or the task child's `agentRunId`), and candidates are cached per focused agent.
- **Team and Org roots:** unchanged. Prompts and the work packet are also unchanged.
- **Tests:**
  - New unit specs for the server port, the web candidate service and the mention scope. Contract tests were extended.
  - New durable E2E `delegated-copy-member-contact-host.e2e.test.ts` (DCM-001..007).
- **Docs:** `agent_communication.md`, `standalone_agent_run_root.md`, `autobyteus-web/docs/chat.md` and `TESTING.md`. See `docs-sync-report.md`.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-001 Pass |
| Code review | CRR-001 Pass (9.4/10). Test-code review CRR-002 Pass, no findings. CRR-003 recheck after API-REV-002 Pass, no findings (no test code changed) |
| API/E2E (API-REV-001) | Pass, confidence 95.3%. DCM E2E ran 5 times plus a mutation check. Browser journeys BJ-001 and BJ-002 and the lifecycle E2Es pass |
| API/E2E (API-REV-002, user-requested) | Pass, confidence 96.7%. Isolated packaged desktop app, public agent package, real model. DSK-001..004 cover AC-001..003 (see below) |
| Delivery, on the integrated state `01ab8b7de` | • `pnpm -C autobyteus-server-ts typecheck`: clean.<br>• `pnpm -C autobyteus-server-ts test:unit`: 666 files passed, 4 skipped; 5100 tests passed. This is the full suite, green on the base that now has a green baseline.<br>• Fake-AGY E2Es `delegated-copy-member-contact-host` and `ad-hoc-task-delegation`: 2 files, 4/4 pass.<br>• `pnpm -C autobyteus-agent-presentation-contracts test`: 16/16.<br>• Web targeted (`services/collaborators composables/agentInput composables/runSettings agentRunCollaborationStore utils`): 78 files, 470 tests pass.<br>• Logs: `delivery-evidence/dr1-*.log` |

## How To Verify (AC-003)

Run an isolated app built from this worktree. It uses separate data and does not touch your own app:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator
pnpm --silent isolated-app start --build
```

1. Start a **Project Task Manager** (PM) Agent run, and have it delegate work to a software engineering Team (a delegated Team copy appears in the run tree).
2. Open the PM's own composer and type `@`.
   Expected: the PM is **not** offered. The other options are as before.
3. Open the delegated Team's **code reviewer** composer and type `@`.
   Expected: **Project Task Manager** is offered.
4. Send `@Project Task Manager please create ticket X` to the code reviewer.
   Expected: the message is posted, and no new collaborator or copy appears in the run tree.
5. Let the code reviewer act.
   Expected: the code reviewer messages the PM, and the message appears in the PM's **existing** conversation and in the Team tab. No second PM appears.

Quick check without the app (about 10 seconds, no model call):

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-member-contact-delegator
env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS \
  RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
  pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts --no-watch
```

## Residual Risks (accepted)

- A real model may not follow the note. The E2E uses a scripted CLI; the note's explicit wording mitigates this, and a wrong `delegate_task` is refused harmlessly.
- Only the AGY runtime ran the new E2E. The E2E files that need a real provider were not run.
- MP-001: if the host's definition is renamed and another definition reuses the old name's slug, catalog addresses can differ between viewers. The address then fails as not found; it never creates a second instance.
- `list_available_agents` is opt-in, so only agents that have the tool benefit.
- A separate ticket could change the `@` menu header and footer copy. It still says "… delegates the work" for the host entry.
- Non-blocking test notes N-1..N-3 from CRR-002:
  - N-1: a tautological host-address fallback.
  - N-2: tree helpers duplicated across the E2E files.
  - N-3: the journey runs in a single `it`.
- The base-failure list in `implementation-evidence/ir-001/server-baseline-failures.txt` is now historical. The integrated base has a green unit baseline, and this branch passes it.

- New observation from API-REV-002, recorded for a separate ticket: when the host replies to a copy member at that member's address, it gets `COLLABORATION_TARGET_NOT_FOUND`. In the run, the PM retried by `target_agent_run_id` and the message was delivered. This behavior already existed and this ticket does not change it, since host-to-copy-member messages go by run ID.

## API-REV-002 During Delivery (user-requested)

- While delivery ran on 2026-10-09, the API/E2E engineer ran a second round at the user's request: API-REV-002, Pass, confidence 96.7%.
  - It used an isolated packaged desktop app (`isolated-app start --build`, instance `iso-61062-6a74`) with the public agent package imported from GitHub and a real model (Claude Agent SDK, `claude-haiku-5-5`).
  - DSK-001..004 passed: the PM delegates to the SE Team, the code reviewer's `@` offers Project Task Manager, and the code reviewer's real-model `send_message_to(/project_task_manager)` reaches the PM's existing run. The PM's own `@` does not offer itself.
  - Evidence: `api-e2e-evidence/api-rev-002/`, including `desktop-journey.mp4` and `shots/`.
- Build state: the packaged build started at 08:18, after the integration merge `01ab8b7de` at 08:09. So it exercised the integrated candidate. The round-2 report names HEAD `24baaf7c5`, but the source under test did not change in the merge.
- No test code changed. The API/E2E record names Code Reviewer for the evidence addendum.
- This is strong product evidence for AC-003, but it does not replace the user's explicit verification.
