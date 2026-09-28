# Implementation evidence — IR-002

All probes run in an owned temp data root on free ports with a sanitized environment; the user's data and desktop app are not touched. Each probe writes an `evidence.json` and the owned backend/frontend logs next to it.

## D-14 — pending first send vs history reconcile

Probe: `d14-reconcile-probe.mjs` (Chrome → Nuxt dev → backend `dist/app.js` → Codex `gpt-5.5`).

Two scenarios:
- **`stale`** is the deterministic reproduction. Right after `PrepareAgentRun` returns, and before the page learns the new run P, it takes a run-history snapshot in which P is inactive. It serves that snapshot to a quiet tree refresh that the page issues the moment P's agent socket opens. An init script records every agent-socket close with its JS stack, the frames received, and the context's `submissionPending`/status at close time. No product code is instrumented.
- **`resend`** is the C07 journey (injected prepare failure → temp chat → resend) repeated N times with the normal 5 s poll. The resend is delayed a random 0–6 s to vary the poll phase.

| Run | Code | Result |
| --- | --- | --- |
| `d14-stale-before-guard/` | before the D-14 guard | LOST. P's socket was closed 8 ms after opening. The run ended in Error and the reply never streamed. |
| `d14-stale-diagnose/` | with the D-14 guard | LOST. Same closer. At close time `submissionPending=false`, status `offline`. |
| `d14-resend-after-guard/` | with the D-14 guard | 14/14 replies streamed, 0 losses. This relies on natural timing, so it is not proof. |

Closer stack, the same before and after the guard:

```
WebSocket.close
  WebSocketClient.disconnect            services/agentStreaming/transport/WebSocketClient.ts
  AgentStreamingService.disconnect      services/agentStreaming/AgentStreamingService.ts
  disconnectAgentStream                 stores/agentRunStore.ts
  reconcileDiscoveredActiveRuns         stores/runHistoryLoadActions.ts
  fetchRunHistoryTree                   stores/runHistoryLoadActions.ts
```

Frames received on P's socket before the close (`d14-stale-diagnose`), times relative to the socket's creation at t=0:
- +2 ms: open
- +5 ms: `{"type":"CONNECTED",...}`
- +6 ms: `{"type":"AGENT_STATUS","payload":{"status":"offline",...}}`
- +6 ms: the stale snapshot is served
- +10 ms: close. At that moment `submissionPending=false` and status is `offline`.

Finding: the backend sends an `offline` status snapshot as soon as the socket connects, which is before `SEND_MESSAGE`. `applyLiveAgentStatusEvent` (`services/runStatus/agentRuntimeStatusState.ts`) clears `submissionPending` on any live status. That breaks the D-14 premise that the flag stays true from `beginLocalUserSubmission` through prepare → connect → send (AF-30). The guard therefore covers only the window before the socket connects; the reproduced race happens after it.

## D-15 — skill request strength

Probe: `d15-skill-strength-probe.mjs`. It drives the real backend through `createAgentRun`/`terminateAgentRun` (bootstrap and materialization only, no model turn), with a fresh shared workspace per case. Results are in `d15-skill-strength/` (`evidence.json`, `backend.log`).

Skill pairs (same name, different source, real skill content):

| Runtimes | Skill | Configured (strong) source | Daily Assistant (weak, ALL_INSTALLED) source |
| --- | --- | --- | --- |
| Claude, Grok (ACP), AGY | `software-tutorial-video-maker` | agent-private copy in the real `software-tutorial-video-maker` agent folder | the real global copy from `~/.codex/skills` |
| Codex | `resume-designer` | agent-private skill in the real `resume-designer` agent | a global copy of the same content |

Codex uses `resume-designer` because `software-tutorial-video-maker` is natively discoverable from the user's `~/.codex/skills`, so Codex would materialize no workspace link for it.

| Runtime | V-A | V-B | V-C | V-D | V-E |
| --- | --- | --- | --- | --- | --- |
| Claude (`.claude/skills`) | Pass | Pass | Pass | Pass | Pass |
| Codex (`.codex/skills`) | Pass | Pass | Pass | Pass | Pass |
| Grok via ACP (`.grok/skills`) | Pass | Pass | Pass | Pass | Pass |
| AGY (`.agents/skills`, Rule 1 only) | — | — | — | Pass | — |

What each case asserts:
- **V-A:** the Daily Assistant starts next to a live configured run. `skipped-held-by-other-run` is logged, and the link keeps pointing at the configured source.
- **V-B:** the configured run starts next to a live Daily Assistant. The link is re-pointed, `yielded-to-configured` is logged naming the Daily Assistant run id, and the Daily Assistant stays active. After the weak run terminates first, the link remains for the configured holder.
- **V-C:** a second configured run with a different source fails with `…is being materialized from…`.
- **V-D:** with a user-owned folder at the skill path, the Daily Assistant starts and `skipped-workspace-owned` is logged. The folder is untouched. The configured run fails with `…already exists as a directory` (AGY: `AGY_SKILL_NAME_COLLISION`).
- **V-E:** after every run terminates, the link is gone. This held for every Rule 2 case, and in V-B the weak holder was released first.
