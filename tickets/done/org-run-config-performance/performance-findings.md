> **Current SR-010 status:** cumulative SR-006 scope is approved, architecture complete (Medium / High) at [design-spec.md](design-spec.md). This initial-round document is factual baseline evidence; earlier approval holds below are historical, not current readiness. Changed-build validation remains outstanding.

# Performance Findings — 2026-10-03

## Initial-Round Result
A concrete shared cold-start bottleneck is verified: the runtime dropdown waits for one all-runtime availability response. This probes Antigravity's model list even when the intended runtime is Codex. It is **not GPT-6.1 Sol inference/model-weight loading**.

The longer general delay reported by the user is **not fully reproduced or explained**. Quiet local Org creation is sub-second. Real transcript size and background model activity remain untested. Packaged post-Run/history-row testing was subsequently completed in SR-003; see `launch-row-findings.md`. The user confirms local desktop, not remote/Docker.

## Setup
- Source UI: isolated worktree `codex/org-run-config-performance`, `1b976216da0cbd0cc84fef3fe22a2739325b8ad3` / version 1.4.93; normal Nuxt browser development path.
- Backend: supported isolated launch of installed 1.4.92 binary. No changed-source validation claimed. Performance-owner paths inspected are unchanged against v1.4.92; intervening config deltas are auto-approval defaults/tests.
- Fresh private data; copy of local `autobyteus-agents` imported through public GraphQL. Source working tree was dirty when inspected; recorded revision is provenance, not an exact copied-content pin. AutoByteus Org: 3 Teams, 10 configured Agents. Package: 14 Teams, 47 Team-local Agents, 7 shared Agents.
- Exact runtime/model: `codex_app_server` / `gpt-6.1-sol`; selectable model observed in UI and server catalog. Default low reasoning retained; no Fast-mode/model/runtime substitutions.
- Initial 2 UI-created Orgs + 18 public API-created idle Orgs; final instrumented UI launch made 21. No model turn was submitted; no provider-response latency test.

## Measurements
Browser rows are passive, actual click/change → corresponding DOM readiness, **not CUA round-trip duration**. DOM-ready is not proof of compositor paint.

| Phase | Measured duration | Basis |
| --- | ---: | --- |
| Warm Org configuration visible | 13 ms | 1 passive run |
| Warm Org references ready | 59 ms | same run |
| Cold Org configuration visible | 307 ms | cold renderer, warm server, 21 idle Orgs |
| Cold Org references ready | 403 ms | same run |
| Cold Org click → Codex runtime offered | **2270 ms** | same run |
| All-runtime availability | **1641–1932 ms** | 3 real browser requests; median 1717 ms |
| Codex selected → model options ready | **156–198 ms** | 3 browser samples |
| Run Agent Org → workspace ready | **599 ms** | 1 passive run; create mutation 531 ms |
| Cold Software Engineering Team config visible | 369 ms | 1 passive run |
| Raw Codex catalog API | 101–154 ms | 5 sequential successful requests |
| Raw Org create API | 336–392 ms | 18 successful idle creates |
| Org inspection API | 3–25 ms | 3 successful requests |
| Existing Org model-options API | 105–614 ms | 3 successful requests; first outlier not attributed |

Independent matching local CLI probes (3 repeats) partition the slow all-runtime response:
- Codex command discovery: 7–9 ms.
- Claude discovery/version: 16–20 ms.
- Grok version/help: 23–28 ms.
- **Antigravity help + models: 1459–1498 ms**; `agy models` accounts for 1392–1436 ms.

The UI option is unavailable until all providers finish; Codex itself is already locally discoverable much earlier. This makes an unrelated runtime's discovery part of Codex selection's cold critical path.

## Source Evidence
- `autobyteus-server-ts/src/runtime-management/runtime-availability-service.ts`: `listRuntimeAvailabilities` awaits `Promise.all` for every provider; Antigravity provider invokes `listAntigravityModels`.
- `.../antigravity-cli-capability.ts`: runs `agy --help`, then `agy models`; help timeout 3 s and model timeout 15 s. These are configured upper limits, not observed 18 s waits.
- `autobyteus-web/composables/useRuntimeScopedModelSelection.ts`: triggers all-runtime query; runtime options derive from completed availability rows. Model catalogs load independently and cache runtime-scoped snapshots.
- `autobyteus-web/stores/runtimeAvailabilityStore.ts`: caches completed response for frontend lifetime; force refresh is separate. No explicit in-flight promise at store level; Apollo query deduplication prevented a duplicate query in these observed cases. Do not claim duplicate runtime requests caused this experiment.
- `.../llm-management/services/codex-model-catalog.ts`: acquire/init → model/list → release; no inference request.
- `.../run-model-selection-service.ts`: multi-scope options/validation already share request-local runtime/workspace catalog promises. Do not propose an already-existing batching mechanism as a new fix.
- `.../components/workspace/config/AgentOrgRunConfigPanel.vue`: fetches required catalogs, exact references, then launches and opens workspace; launch does not pick an Org recipient.

## Secondary Observations (Not Root-Cause Conclusions)
- One fresh launch observed 20 member-projection responses for 10 configured Agents in two batches. They were only 17–29 ms each; redundant lifecycle work deserves tracing, but this is not proof of the user's long delay.
- Cold Nuxt initialization generated main-thread long tasks up to 1454 ms. Dev dependency optimization/first-load errors and host Spotlight/VM load confound these. No packaged renderer hotspot or history-volume regression is established.
- Idle history polling stayed fast (median workspace 3 ms; collaboration roots 8 ms) at 21 Orgs. Real long conversations and active stream load are not represented.

## Preserved Behavior / Safety
No user run was stopped or modified. No user application data or credentials were copied. No model turn sent, provider inference spawned, definitions rewritten, release issued, or production fix made. Disposable passive plugin removed; test Chrome tab closed; owned Nuxt/collector stopped. `cleanup-receipt.json` confirms isolated app graceful shutdown, private data deletion and ports released.

## Next Decision
User now confirms the symptom is on the **local desktop node**; approximate elapsed seconds remain unspecified. No remote/Docker cause is proposed. Initial proposed change removes unrelated runtime discovery from Codex readiness. After the user separately requested post-Run/new-row testing, SR-003 adds verified creation/history-scaling evidence and proposed requirements; see `launch-row-findings.md` and current canonical requirements. Preserve availability, schema/admission, identity, history freshness and explicit model/runtime choices. User approval of the requirements is required before architecture or implementation.

## Evidence Index
Canonical factual supplement: this file. Raw evidence: `timing-summary.json`, `passive-ui-events.jsonl`, retained passive probe/collector source, `api-baseline-initial.json`, `codex-catalog-baseline.json`, `capability-cli-timings.json`, `definition-baseline.json`, `org-idle-history-scaling.json`, `org-reader-baseline.json`, `source-context.json`, `isolated-app.log`, install/dev logs, launch/stop/cleanup receipts and `control-timing-caveats.md`.
