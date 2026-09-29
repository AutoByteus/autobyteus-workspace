# Implementation evidence — IR-002 and IR-003

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

## D-14 (SR-010) — the activation-pending marker (IR-003)

Same probe, `d14-reconcile-probe.mjs`, with three changes:
- It adds a `stale-resume` scenario: chat until a reply arrives, terminate the run, wait until the page shows it Offline, snapshot the history (P inactive), then resend.
  - The resume reuses P's still-connected socket, so the stale refresh is triggered right after the client sends `SEND_MESSAGE`. The first-send `stale` scenario still triggers at P's socket open.
- The stale snapshot is now served only to the refresh the page triggers, never to an ordinary poll.
- Pass requires both a streamed reply and no close of P while the send awaited activation.

"Without marker" means the IR-002 commit `46f28bb9f` (the SR-008 `submissionPending` guard), with this round's web changes stashed. "With marker" means commit `5f11d52f6`.

| Scenario | Without marker | With marker |
| --- | --- | --- |
| First send (`stale`) | FAIL: P closed by reconcile, reply lost, run in Error (`ir3-stale-first-send-without-marker/`) | PASS: stale snapshot served 5 ms after P's socket opened, no close, reply streamed (`ir3-stale-first-send-with-marker/`) |
| Offline resume (`stale-resume`) | FAIL: P closed by `reconcileDiscoveredActiveRuns` 3 ms after the stale snapshot, with P already `initializing` and `submissionPending=false`; reply lost (`ir3-stale-resume-without-marker/`) | PASS: stale snapshot served after `SEND_MESSAGE`, no close, reply streamed (`ir3-stale-resume-with-marker/`) |
| Resend journey ×14 (`resend`) | — | 14/14 PASS, 0 losses (`ir3-resend-with-marker/`) |

No close of P occurred with the marker in any run, so there was no stack to return as `Unclear`.

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

## D-17 — the chat run view in the workspace frame (IR-005)

Script: `ir5-run-view-check.mjs`, run against the dev environment (`pnpm dev`; web :3000, backend :8000, data root `.autobyteus/development`). It uses real Chrome at 1440×900 (and 390×844 for K), real Codex, and the historical Article Writing Team run for the Team comparisons. Results and screenshots are in three folders:

- **`ir5-run-view/`** holds the first full pass.
  - Its D, E and F results are superseded. D and E navigated with full page reloads, and F used the wrong strip selector (`-surface`, which attribute fall-through replaces).
  - The script now navigates in-app through the Vue router.
- **`ir5-run-view-tabs/`** holds D, E and F rerun with in-app navigation.
- **`ir5-run-view-g/`** holds G rerun after the stopped-run workspace fix, with a unique reply marker.

| Check | Result |
| --- | --- |
| A — VIS-015 frame | Pass. The header runs to x=988 and is 57px tall; the right panel starts at x=990, top 0, full height; the tab bar's bottom sits at 57. The chat title is the first message. There is no Chat footer; ⚙ and ＋ are present. |
| B — `/` in the run-view box, VIS-016 | Pass. `/` lists skills and Enter adds a chip. The sent message shows the chip, and the tooltip gives the exact text sent. |
| C — ⚙ while live, VIS-026 | Pass. Model and thinking are disabled, the "Stop this run before changing model settings." note shows, Save is disabled, and the label is "OpenAI / GPT-5.5 (default reasoning: medium)". |
| D — geometry and default tabs | Pass. Chat and Team geometry are identical: center 323–988, header 57, panel 990–1440, handle 986–990. Team opens on Team members; chat (Files) → Team opens Team members; Team → chat opens Activity. |
| E — reopening keeps the tab | Pass. Artifacts is kept after Agents → back to the same chat. |
| F — strip → exact tab, VIS-018; shared collapsed state | Pass. In Chat, Files, Terminal and Artifacts each open exactly that tab. In Team, Files and Terminal do. Collapsing in Chat leaves Team collapsed, and reopening in Team leaves Chat open. |
| G — Offline ⚙, VIS-017 and VIS-019; AC-009 | Pass. The stopped note shows. The known workspace is shown (after the fix). Save selects `gpt-6-astra`, and the resumed run is active on `gpt-6-astra`. |
| H — ＋ | Pass. It routes to `/chat`, with a New chat preset (Temp workspace). |
| I — ⚙ on a failed first send (`temp-*`) | Pass. `DraftRunConfigEditor` changes the model to `gpt-5.6-luna`, and the send uses it. No run-config calls happen between ⚙ and send; the only GraphQL read is the pre-existing Skill Improvement capability query. |
| J — ⚙ on a catalog "Run agent" draft | Pass. The model changes to `gpt-5.6-luna` and the send uses it. No GraphQL calls happen between ⚙ and send. |
| K — narrow 390×844, VIS-027 | Pass. Left and right product strips show, the title is visible, and mic/send sit inside the box. |

## CR-005 (CRR-008) — run settings stay with their run (IR-006)

Check `L` in `ir5-run-view-check.mjs`, run on the dev environment; results are in `ir6-cr005/`. It opens ⚙ on an existing chat, leaves it open, starts a New chat with the Chat pencil (Codex `gpt-5.5`) and sends. It runs twice:

| Case | Result |
| --- | --- |
| First send | Pass. The new chat lands on `/chat?id=<permanent>` with its conversation and box; no settings view is shown. |
| Failed first send (injected `prepareAgentRun` failure) | Pass. The new chat lands on `/chat?id=temp-*` with its conversation and the visible error; no settings view is shown. |

The first attempt of this check sent with the New chat's default model, which in the dev data root is an Anthropic model with no API key. The conversation still showed correctly; the check now picks the Codex model first.
