# Codex background lifecycle — experimental result / SR-006

## Context and status
Package `backend-port-conflict-20261024`; original delegated request: diagnose and safely fix backend port-conflict/restart and application-owned background cleanup, preserve data/unrelated work, validate in isolation, ultimately merge/verify base and clean up. No release/install. The user explicitly confirms the historical testing server was launched by Codex through bash and now asks for experiments establishing background lifecycle events before deciding the correct solution. Accept that origin as user evidence; precise command, Codex version and historical process tree remain unavailable.

**Outcome: evidence-only investigation completed, not Architecture Design Complete, implementation acceptance, or Terminal.** R1 remains Approved, D3.1 was independently passed at ARCH-REV-003/2630c26f8. Native implementation exists at f247bf6f6; it does not intercept Codex conversation commands. No new Codex production mechanism is approved by this report. Full AutoByteus host/desktop shutdown with Codex work is still unverified and the original Nuxt survivor has not been reproduced.

Workspace: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024`, branch `task/backend-port-conflict-20261024`; recorded base/finalization target `origin/personal@034bfe51ab697817773ff545d369e1cfc03a79c5`. Shared checkout and implementation-owned SDK dist outputs untouched. Canonical documents are requirements-doc.md, investigation-notes.md, design-spec.md and solution-revision-record.md in this ticket. Relevant REQ-003/004/005, AC-004/005, BEH-003/004, UC-002. Approved behavior and ordinary agent/idle lifetime constraints are unchanged.

## Method: actual tool runtime, deterministic model fixture
macOS, installed Codex 0.164.0, Node26.12.0. Production `CodexAppServerClient` starts a private `codex app-server`. A localhost mock Responses SSE endpoint emits an `exec_command` function call and a subsequent assistant completion; the real Codex conversation tool executes bash and starts an actual Node HTTP426 listener. This is NOT a real model inference and NOT a fake command execution. No paid provider request or user auth was used. Private HOME/CODEX_HOME/TMPDIR and OS-assigned ports isolate the fixtures from the installed app and existing previews. Codex may bootstrap its public default plugin catalog in that private home; this is not an assertion of zero external network traffic.

Reproduce from the worktree:
```
env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" autobyteus-ts/node_modules/.bin/vitest run --config tickets/in-progress/backend-port-conflict-20261024/evidence/probe.config.mjs -t P-011
```
Fixture `evidence/codex-conversation.probe.test.ts`; final log `evidence/probe-codex-background-expanded.log`. Actual command events, thread IDs, provider process IDs, fixture OS PIDs and HTTP observations are recorded. Final run: **6 tests passed**, 10 unrelated probe tests skipped. These are investigation tests, not whole-product acceptance/regression coverage.

## Results
| Case | Observation |
|---|---|
| Yielded server + clean | Assistant turn completed while HTTP426 server remained live. `thread/backgroundTerminals/list` returned its command. `.../clean` returned `{}`, the list emptied and HTTP became unreachable. `item/completed` reported failed / exitCode -1 after forced termination. |
| Yielded server + terminate | `.../terminate` with the listed provider processId returned `{terminated:true}`; list emptied and HTTP became unreachable. Completion event reported failed / -1. |
| Yielded server + client close | List still contained the command and HTTP426 remained live just before production `client.close()`. Closing the Codex client stopped the listener. |
| Plain shell background (`server >log 2>&1 &`) | Receipt proves listener started, but it had exited by the post-turn inspection. List empty, HTTP unreachable before client close. No leak reproduced. |
| `nohup server >log 2>&1 &` | Same observation: started, then no longer serving by post-turn inspection. No leak reproduced. Do not infer all daemonization forms are covered. |
| Natural completion | Turn completed with background server still live/listed. Later, without a model `write_stdin` call, `item/completed` arrived with completed / exitCode0; list emptied and listener disappeared. Test explicitly asserts completion-event ordering after turn completion. |

Final listener PID/port receipts: 75230/51484, 75284/51495, 75362/51507, 75418/51517, 75475/51527, 75530/51536. These are historical fixture IDs, NOT authority for future signalling. Cleanup receipt `evidence/probe-codex-background-cleanup.json` records no remaining known fixture PIDs/private roots across all rounds; schema temp root removed. Test cleanup rechecks its unique command receipt path before signalling any remaining test process.

**Answer to the user's event question:** yes, this version exposes command start/completion notifications and experimental per-thread list/stop APIs. Assistant-turn completion is not command completion. A command item/process handle represents a tracked command session, not a complete OS descendant inventory. The list's `processId` is an opaque provider identifier; `osPid` was null in these tests. Never treat that identifier as an OS PID or use a port as ownership authority.

## API and source evidence
- Installed CLI `app-server generate-json-schema --experimental` exposes `thread/backgroundTerminals/list`, `/clean`, `/terminate`; default schema generation omits experimental endpoints. Saved relevant exact schemas: `evidence/codex-0.164.0-background-schemas.json`. Tests initialize `capabilities.experimentalApi=true` and exercise the endpoints, rather than assuming schema availability proves behavior.
- Official reference consulted: https://learn.chatgpt.com/docs/app-server . Version-specific runtime evidence above is authoritative for these observations, not a guarantee for every installed version.
- `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` already enables experimentalApi, owns exact per-cwd client leases and closes clients. No diff from recorded base for this file.
- `.../backends/codex/thread/codex-client-thread-router.ts` routes thread-identified events by thread ID even without an active turn. Notification handler does not inherently discard command completion just because a turn completed. This is source tracing, not a full frontend event-path test.
- `.../backends/codex/backend/codex-agent-run-backend.ts:105-108` comments that background terminals are model-polled and always returns false from `hasRunningBackgroundTasks()`. The claim that polling is the only signal is incomplete in 0.164.0. Repository Codex adapters currently have no `backgroundTerminals` calls. Do not equate that with a proven shutdown leak: actual client close worked in the measured case.
- Implementation Engineer confirms no Codex lifecycle implementation change in f34ad8749; native scope is injected only into autoByteus provider configuration. Shared host sequencing affects existing provider owners but native tests alone cannot prove Codex cleanup.

## Failed attempts retained
P-009 initial shell-background test inspected its receipt too early and failed; not a product defect. Its yielded-client-close observation succeeded. P-010 first three-case run completed lifecycle observations but natural-completion cleanup hit ENOTEMPTY during Codex private plugin bootstrap; not a lifecycle failure. Exact private root was subsequently removed after its processes exited. P-010 four-case rerun passed. Frozen sources/logs are retained, not silently replaced: codex-conversation-initial.ts, codex-background-api-initial.ts, codex-background-api-four-case.ts and corresponding initial/API/rerun logs. Two read-only log-summary scripts also failed (ANSI/scalar JSON parsing); corrected parsing produced the saved cleanup receipt. No production consequence.

## Implications and next work
1. Native anchor implementation is a real fix for the independently reproduced native defect; it is not evidence that the user's Codex-origin incident is fixed.
2. Do not invent a Codex process scanner/kill mechanism based on these results: provider-native tracking and cleanup exist, and orderly client close works for the tested server. Completion events/listing are suitable candidate inputs for tracking, but experimental-version compatibility and escaped descendants require explicit treatment before any design change.
3. Next required investigation/validation is the actual AutoByteus application/backend shutdown chain with a Codex conversation-launched long-running command, including retained thread/client leases and failed/forced shutdown. Compare awaited close with the previous path; collect actual PID and listener absence, not just RPC success. The historical exact bash command, if available, would improve Nuxt-specific reproduction; user origin is not in doubt.
4. A Claude-like background-task frontend is not newly approved by this investigation. It could use these capabilities, but changing ordinary agent/idle behavior or adding UI must not be smuggled into this shutdown fix.
5. No material new requirement is needed just to investigate/verify the approved managed-command shutdown behavior. If a concrete Codex ownership defect requires design changes, revise canonical design and route independent review before dependent implementation. Current evidence does not justify declaring such a change complete or claiming the overall task done.

Routing: evidence-only response to the user's experiment request; no configured Architecture Design Complete/Release/Delivery-receipt rule applies. Share this result with Implementation Engineer as the answer to its pending evidence/design-implications question, not as duplicate implementation forwarding or a new approved design. Continue the overall task; no merge, release or completion reported.
