# Docs Sync Report

## Scope

- Ticket: `grok-self-started-turns-517` (Project Task `autobyteus-517`, round 3: the Grok follow-up `483-FU-004`, option (b) decided by the user), `task_size: Medium`, `architectural_risk: High`, route: reviewed (architecture review ARCH-REV-005 Pass on SR-001..SR-005; code review CRR-001 Fail then CRR-002 Pass; API/E2E `API-REV-001` Pass at 95.1%; test-code review CRR-003 Pass).
- Trigger: the code reviewer's handoff after the post-API/E2E test-code review (CRR-003 Pass).
- Bootstrap base reference: `origin/personal` @ `ca4317a386`.
- Integrated base reference used for docs sync: `origin/personal` @ `ca4317a386` (`Already current` at the start of delivery: the ticket branch was 0 commits behind it). Before the first push the base advanced to `9ffa985b45` (autobyteus-565, 20 commits); it was merged as `276ff28e5b` with no conflict. Its docs changes (`collaboration_model.md`, `agent_communication.md`, `remote_collaboration.md`, `run_history.md`, web docs) are not the docs this ticket changed, so the sync below stands.
- Post-integration verification reference: ticket branch `276ff28e5b`: both typechecks PASS at baseline, 299 ACP, Grok, DeepSeek, connection and memory unit tests PASS, the 13 scripted Grok replay and compaction E2E cases PASS (see `release-deployment-report.md`).

## Why Docs Were Updated

- Summary: a Grok agent's own turn (after its background command ended) now appears in the run, and the shared ACP connection delivers notifications to their session in wire order. `grok_build_runtime.md` said "Updates that arrive outside a prompt are ignored" and "queue bookkeeping, are ignored", which stopped being true for Grok's prompt signals; the memory recorder's allow-list of system notice senders gained one; the published release notes of v1.5.13 say a Grok agent "was not woken".
- Why this should live in long-lived project docs: the next change to the ACP session, the connection's inbound stage or Grok's signals must know the turn origins, the one-batch hand-over, why the stage exists (the SDK lets a response overtake earlier notifications) and the cases that must be rerun after an SDK upgrade.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Owner of the ACP layer, the Grok profile and the turn state machine | Updated | Source layout (the inbound stage; the prompt-signals file), "Between turns", a new section "Turns Grok starts itself", the stream-conversion note on queue bookkeeping, interrupt, and the validation list. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Lists the system notice senders the memory recorder allow-lists | Updated | One mention: `system.grok_provider_turn`, linked to the new section. |
| `GLOSSARY.md` | "Provider-started turn" | No change (already updated by the implementation) | Confirmed against the code: origin `provider`, Claude and Grok, `system.claude_background_task` and `system.grok_provider_turn`, busy while it runs, a message waits, Stop cancels. |
| `autobyteus-server-ts/docs/modules/deepseek_harness_runtime.md` | DeepSeek shares the neutral ACP connection and session | No change | Its behaviour is unchanged: dsh sends no prompt signals, so its session never opens a provider turn; the wire-order delivery is the neutral layer's, documented in `grok_build_runtime.md` (which this doc already names as the other ACP runtime). |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | The Grok "Long-Running Commands" section says completion "appears in the conversation; act on it" | No change | The sentence is true for Grok (it acts on the completion itself) and is now also true in the run. The requirements keep the section text. |
| `autobyteus-web/docs/agent_execution_architecture.md` | The `SYSTEM_TASK_NOTIFICATION` handler and segment | No change | They render any sender generically, as the design's "Derived consumers" says; the notice shows like Claude's background-task notice. |
| `DESIGN.md`, `docs/design-cases.md` | Project design rules and design cases | No change | The ticket adds no rule. A design case for the SDK's frame-order assumption (design Impact IR-001, SR-004/SR-005) is the Solution Designer's to add (its skill's Recovery); delivery noted it in the terminal message. |
| `TESTING.md` | Rules the validation followed (gated suites, no real keys, rerun by impact, both typechecks) | No change | Followed as written. The live case needs a signed-in `grok` (its own gate `RUN_GROK_E2E=1`, in the file header, as TESTING.md says for gated suites). Proposal, not made here: a "Choosing the path" row for a change to the shared ACP connection or session (the ACP unit suites, the Grok replay and compaction replay, and the DeepSeek scripted-provider suite) would help the next ACP change; it is API/E2E's document and the ticket's reports already name the suites, so it is left to the Solution Designer and API/E2E. |
| `RELEASE.md` | Finalization target, Secret Gate | No change | Followed as written; no deviation. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Behavior correction and new section | (1) Source layout: the connection's inbound stage (notifications reach their session synchronously in wire order, before a later frame, a response included, reaches the SDK) and `grok-build-prompt-signals.ts`. (2) "Between turns": updates outside a prompt are still ignored, except the prompt signals of an agent whose profile reads them (Grok); DeepSeek sends none. (3) New section "Turns Grok starts itself": the two signals (`_x.ai/queue/changed` with a running prompt, `turn_completed`), the provider turn (`TURN_STARTED` and one `system.grok_provider_turn` notice in the same batch, content as in any turn, ended by its own `turn_completed`, busy meanwhile), the recorded notice, held input and Stop, the one-batch hand-over when a job ends during an input turn (no idle in between, no second `session/prompt`), and what is not covered (a prompt sent at the instant Grok wakes; provider content before the input prompt's response; an SDK upgrade reruns the connection cases and the ACP suites). (4) Stream conversion: queue bookkeeping is ignored except the running-prompt queue change. (5) Interrupt: the same for Grok's own turn. (6) Validation: the new replay cases and the live case. | The doc described the old behavior. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior correction | The recorded system notice senders now include `system.grok_provider_turn`. | The allow-list gained a sender. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Why the ACP connection has an inbound stage | The SDK resolves a response at once but awaits notification handlers one by one, so a `session/prompt` response could overtake the notifications before it; the stage delivers notifications synchronously in wire order (malformed `session/update` dropped, handler failures logged and contained). | `design-spec.md` (SR-004/SR-005), `evidence/IMP-01-sdk-delivery-order.log`, `implementation-handoff.md` (Item 0) | `grok_build_runtime.md` (source layout, "Not covered") |
| The two turn origins and the hand-over | An input turn ends at its `session/prompt` response; a provider turn ends on its own `turn_completed`; a provider prompt that queued during an input turn is handed over in one batch so the run never reads idle and held input stays held. | `design-spec.md`, `acp-agent-session.ts` | `grok_build_runtime.md` ("Turns Grok starts itself"), `GLOSSARY.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `filterForeignResponses` in `acp-client-connection.ts` | `inboundFrameStage` (drops foreign responses as before, and delivers notifications in wire order) | `grok_build_runtime.md` (source layout) |
| The SDK `Client.sessionUpdate` / `extNotification` handlers as the delivery path | Required no-ops; delivery happens in the inbound stage | `grok_build_runtime.md` (source layout) |
| "Updates that arrive outside a prompt are ignored" (Grok) | Grok's prompt signals open a provider turn | `grok_build_runtime.md` ("Between turns", "Turns Grok starts itself") |
| The v1.5.13 release note "a Grok agent was not woken when its background command ended" | Grok was woken; AutoByteus now shows the turn | `release-notes.md` (this ticket) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not used. Docs impact: `Updated`.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence (done, see `release-deployment-report.md`), archive, finalization onto `origin/personal`, no release.
- Notes: `FU-001` (Grok's startup against the 15 s discovery bound) was recorded by delivery from the implementation's candidate; the `app.close()` stall in the in-process E2E `afterAll` is `FU-002` of `tickets/done/followups-483-517/follow-ups.md` (already recorded there), so it is not repeated.
