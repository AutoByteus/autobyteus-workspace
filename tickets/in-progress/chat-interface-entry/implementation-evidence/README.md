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

## D-15 Rule 3 — V-F: the desk-package team next to a live Daily Assistant (IR-007)

> Superseded by IR-008: D-19 removes Rule 3; see "V-F rerun under D-19" below. Kept for history.

Probe: `ir7-vf-probe.mjs`; results in `ir7-vf/` (`evidence.json`, `backend.log`). It uses an owned temp data root, a free port, a sanitized env and the real backend (`dist/app.js`), and copies the API/E2E desk package (`../api-e2e-evidence/test-data/chat-entry-desk-package`) into the data root. For each runtime it runs these steps in one fresh workspace:
1. Start the Daily Assistant (ALL_INSTALLED). It holds a weak `desk-alpha` link to `agents/desk-helper/skills/desk-alpha`.
2. Create `desk-team`, whose `/lead` names `desk-alpha`. That name is unresolved for the lead, because the skill lives only in the helper's folder.
3. Send the lead its first message over `/ws/agent-team/<teamRunId>`. Team members activate on their first message, and so do their skills.

| Runtime | Result |
| --- | --- |
| Codex (`gpt-5.5`) | Pass. The lead replies `DESK-TEAM-OK`; one `skipped-unresolved-held-by-weak` line (run `desk_lead_*`, `previousTarget` = the helper's `desk-alpha`); no path collision. The link still points at the Daily Assistant's source, and it is removed after both runs terminate. |
| Claude Agent SDK (`haiku`) | Pass, same observations. |
| Grok (ACP, `grok-4.7`) | Pass, same observations. |

The first version of the probe only created the team and waited. It logged no Rule 3 line on any runtime, because no member had started: team members start on their first message. The probe now sends that message, and it fails unless the lead replies and a Rule 3 line is logged. Before the fix, API/E2E DT-24/C20 saw the lead fail with `Workspace skill path collision`. The unit tests cover the collision that remains when a strong holder exists.

## D-18 / IC-3 — explicit chat `llmConfig` (IR-007)

Checks `M-codex_app_server` and `M-claude_agent_sdk` in `ir5-run-view-check.mjs` run on the dev env; results and screenshots are in `ir7-d18/`. Each check follows these steps:
1. Start a New chat on the model and leave thinking untouched.
2. Send, and wait for the reply.
3. Read `getAgentRunResumeConfig.metadataConfig.llmConfig`.
4. Compare it with the defaults read directly from the model's raw schema, split into thinking and non-thinking keys.
5. Open the live ⚙.

| Model | Recorded `llmConfig` | Result |
| --- | --- | --- |
| Codex `gpt-5.5` | `{reasoning_effort: "medium"}`. The schema's non-thinking `service_tier` has no default, so it is absent, as it is in the launch form. | Pass. Non-thinking keys equal the launch form's; the thinking keys equal the schema defaults. ⚙ shows Thinking on and Reasoning Effort `medium`, both disabled, with Save disabled. No "Not recorded" text and no `missing-historical-config` marker. |
| Claude Agent SDK `sonnet` | `{thinking_enabled: false, reasoning_effort: "medium"}` | Pass. The same equalities hold. ⚙ shows Thinking off and Reasoning Effort `medium`, both disabled, with the "Stop this run…" note. No "Not recorded" text. |

## V-F rerun under D-19 — no special rule (IR-008)

Probe: `ir8-vf-probe.mjs` (the IR-007 probe with D-19 assertions); results in `ir8-vf/`. Same setup: an owned backend, the desk package in the data root, a Daily Assistant started first, then `desk-team`, and a first message to `/lead` over the team stream.

| Runtime | Result |
| --- | --- |
| Codex (`gpt-5.5`) | Pass. The lead replies `DESK-TEAM-OK`. The Daily Assistant and the lead use the same catalog copy (`agents/desk-helper/skills/desk-alpha`). No path collision, and no `desk-alpha … could not be resolved` warning. No Rule 2/3 disposition is logged (`skipped-unresolved-held-by-weak`, `skipped-held-by-other-run`, `yielded-to-configured`). |
| Claude Agent SDK (`haiku`) | Pass, same observations. |
| Grok (ACP) | Pass, same observations. |

## D-19 — one skill per name (IR-008)

Probe: `ir8-d19-probe.mjs`; results in `ir8-d19/` (`evidence.json`, `backend.log`). It runs an owned backend with a sanitized env. `CODEX_HOME` points at an owned folder, so the Codex runtime default folder (tier 4) is `<owned>/codex-home/skills`. The real `~/.codex/auth.json` and `config.toml` are copied there only so Codex can start; the owned root is deleted at the end, and no credential appears in the evidence or the log. Settings order is `[CODEX_HOME/skills, autobyteus-skills]`, the real AF-36 layout.

| Check | Result |
| --- | --- |
| P1 — precedence, real layout | Pass. `resume-designer` exists in both folders with different contents. `skill(name)` returns the `autobyteus-skills` copy, the skill is listed once, and `skillNameIssues` lists the Codex copy as `shadowed_runtime_default`. |
| AR13-T4 — tier 4 vs tier 3 | Pass. Detail, file tree, `skillFileContent`, `updateSkill` and `deleteSkill` all act on the tier-3 copy. The Codex copy's tree hash is unchanged. After the delete, the Codex copy becomes the catalog's copy. |
| AR13-T2 — tier 2 vs tier 3 | Pass, the same for an app-data package copy vs an `autobyteus-skills` copy. |
| I1 — add a folder with a duplicate | Pass. `SKILL_NAME_CONFLICT` with `{ name, existingPath: desk-helper copy, incomingPath }`; the `.env` and `skillSources` are unchanged. |
| I2 — create a skill with an existing name | Pass. `SKILL_NAME_CONFLICT`; no folder is created. |
| I3 — create a skill that duplicates only a runtime default copy | Pass. Accepted; the new skills-folder copy is used and the Codex copy is `shadowed_runtime_default`. |
| I4 — import a local package with a duplicate | Pass. `SKILL_NAME_CONFLICT` (existing `autobyteus-skills` copy vs the package copy); the package list is unchanged. |
| I5 — R-3 reload | Pass. An out-of-band `desk-alpha` is added to an imported package. The reload is rejected with `SKILL_NAME_CONFLICT`, the package stays registered, and the banner data lists the pulled copy as an ignored `conflict`. |
| C1 — Codex runtime duplicate | Pass. A `desk-lead` Codex run with a stale `CODEX_HOME/skills/desk-alpha` links the workspace to the catalog copy (`agents/desk-helper/skills/desk-alpha`) and logs `codex-runtime-duplicate: skill='desk-alpha', codexPaths='<owned>/codex-home/skills/desk-alpha', chosenPath='<owned>/server-data/agents/desk-helper/skills/desk-alpha'`. |

Not covered live: GitHub import and update rejection (unit tests with a mock installer cover download deletion and the update rollback).

## D-19 rendered check (IR-008)

Script: `ir8-d19-ui-check.mjs` on the dev env (`pnpm dev`); results and screenshots in `ir8-d19-ui/`. It uses real Chrome at 1440×900 (U5 at 390×844). Fixtures: an out-of-band duplicate `ui-dup` (skills folder vs `agents/ui-fixture-agent`), `ui-dup-pkg` in that agent, an incoming folder and an incoming package in a temp folder. All are removed at the end (verified).

| Check | Result |
| --- | --- |
| U1 — Skills page banner | Pass. The amber banner shows the D-19 copy; "Show details" lists `ui-dup` with "Rename or remove one copy.", the used path and the ignored path. |
| U2 — Sources → Add Folder with a duplicate | Pass. "Duplicate skill names" with one row ("Already installed:" / "New:"), OK focused and on top of the Sources dialog. Esc closes it. The folder is not added, and the Sources dialog shows no inline error. |
| U3 — Create skill `ui-dup-pkg` (exists in a package) | Pass. The pop-up lists the package path and the would-be skills-folder path. OK closes it, the create dialog stays open with the name, and nothing is created. |
| U4 — Settings → Agent Packages → Import a package with a duplicate | Pass. The pop-up appears; a backdrop click closes it; the package is not listed; no success or error message. |
| U5 — narrow 390×844 | Pass. The dialog fits the viewport; both paths truncate with tooltips. |

The first U3 attempt used `ui-dup`, which already existed in the skills folder itself. It hit the old "already exists" check (a plain error, so no pop-up). `createSkill` now reports that case as a conflict too (D-19: the own-folder check is extended to tiers 1–3).


## D-19 Agent Org layouts (IR-009)

Probe: `ir9-org-probe.mjs`; results in `ir9-org/` (`evidence.json`, `backend.log`). It uses an owned backend with a sanitized env and real runtimes. A package root (`AUTOBYTEUS_AGENT_PACKAGE_ROOTS`) holds `agent-orgs/org-desk`, which has two members:
- an org-owned agent `org-writer`, with skill `org-writer-skill`;
- an org-owned team `org-crew`, with shared skill `org-crew-shared` and team-local agent `member` (skill `org-member-skill`).

The runs use the exact ids `agent-org-owned-agent:org-desk:org-writer` and `team-local-agent:agent-org-owned-team%3Aorg-desk%3Aorg-crew:member`. Org-owned definitions are not in the shared `agentDefinitions` listing.

| Check | Result |
| --- | --- |
| O1 — catalog | Pass. `skills` lists `org-writer-skill`, `org-crew-shared` and `org-member-skill` at their org paths. |
| Codex (`gpt-5.5`) | Pass. The org agent's workspace link `.codex/skills/org-writer-skill` resolves to the org agent's folder. The team-local agent's links for `org-crew-shared` and `org-member-skill` resolve to the org team's folders. |
| Claude Agent SDK | Pass, the same with `.claude/skills`. |
| Grok (ACP) | Pass, the same with `.grok/skills`. |
| AGY | Pass. The run capsule holds `.agents/skills/<name>` copies of each agent's own skills. |
| O2 — duplicate org import | Pass. A second package whose org team ships `org-writer-skill` is rejected with `SKILL_NAME_CONFLICT` (the existing org path vs the incoming org path); the package list is unchanged. |

The AutoByteus native runtime is covered by unit tests (`resolveConfiguredSkillsForAgent`), not live, because it needs a native model API key.
