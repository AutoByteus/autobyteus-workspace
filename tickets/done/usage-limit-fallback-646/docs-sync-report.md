# Docs Sync Report — usage-limit-fallback-646 (autobyteus-646)

## Scope

- Ticket: `usage-limit-fallback-646` (autobyteus-646), `task_size: Large`, `architectural_risk: High`, route `Reviewed` (architecture review ARCH-REV-001 … 005, Pass at the 9-point bar; source reviews CRR-001 Fail, CRR-002 Pass, CRR-004 Pass; API/E2E API-REV-001 Pass 94%; test-code review CRR-003 Pass).
- Trigger: the code reviewer's CRR-004 Pass (the base refresh merge), which returned the package after delivery's conflict reroute.
- Bootstrap base reference: `origin/personal` @ `bc4351cad7`.
- Integrated base reference used for docs sync: `origin/personal` @ `85174411168c` (125 commits: autobyteus-516 extensions, autobyteus-657, autobyteus-581 sandbox provider relay and others), merged by the implementation engineer as `3a541e3d45` after delivery routed its one import conflict (`build-studio-server.ts`); reviewed as CRR-004. The base did not move again.
- Post-integration verification reference: `3a541e3d45` at HEAD `78df7abb81`; see `release-deployment-report.md` § Initial Delivery Integration Refresh and `evidence/DEL-post-integration/`.

## Why Docs Were Updated

- Summary: a run whose turn fails on its runtime's usage limit now continues on another usable runtime. The failure is a **run event** (`usage_limit_reached`) on a new node-wide hub (`run-events/`); two listeners act on it: the exhaustion view (which models are used up until their reset, or for an hour) and the switch listener, which chooses a fallback (the Model Router when Model Routing is on and answers within 40 s; else the agent's history; else the node's most-used usable runtime and model; else the first usable runtime), switches the run through the existing runtime switch and hand-over, and writes a switch record (kept 90 days). A delegated or peer-started run does not start on a remembered-exhausted default. A new setting `AUTOBYTEUS_USAGE_LIMIT_SWITCH_ENABLED` (on by default) controls the switch.
- Why this should live in long-lived project docs: `run_events.md` is where the next listener or event kind reads how the hub works; `model_routing.md` holds the fallback order, the budget and the retention; the glossary and the collaboration model define terms and the remote-start rule that now include the node fallback.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | The ticket adds no rule; the 500-line limit keeps `standalone-agent-run-lifecycle-service.ts` at 499 and `root-team-run.ts` at 498 non-empty lines (the reviewer's residual). |
| `TESTING.md` | New gated suites | No change | It keeps no per-suite descriptions; the gates are in the suite files and `run_events.md`. No build input changed. |
| `RELEASE.md` | Finalization and release rules | No change | Followed as written; the release is held by the Solution Designer (below). |
| `GLOSSARY.md` | "Agent runtime switch" described only the person's switch of a stopped Agent | Updated | One sentence: since autobyteus-646 a usage limit can also make the switch automatically (the **automatic runtime switch**), with the fallback order and links to `run_events.md` and `model_routing.md`. |
| `autobyteus-server-ts/docs/modules/run_events.md` | The new subsystem | No change by delivery (new in the code commits) | Verified against the code: the event shape (`usage_limit_reached`, `blockedModels`, `resetAt`), the 31-day run-event retention (`RUN_EVENT_RETENTION_DAYS = 31`), the compositions and the tests. |
| `autobyteus-server-ts/docs/modules/model_routing.md` | The fallback choice, the budget, switch records | No change by delivery (already updated) | Verified: 40 s budget (`ROUTING_BUDGET_MS = 40_000`), 30-day history reads, switch records sealed at 4 MB and deleted when older than 90 days (`SWITCH_RECORD_RETENTION_DAYS = 90`; DEC-008 is the default until the founder decides), `chosenBy` `model_router | agent_history | node_fallback`, `AUTOBYTEUS_USAGE_LIMIT_SWITCH_ENABLED`. |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | `readRuntime(kind)`, `ERROR_CLASSIFIED`, Codex's `error_kind` | No change by delivery (already updated) | Symbols exist in the code (`usageLimitExceeded` in `backends/codex/events/codex-error-kind.ts`). |
| `autobyteus-server-ts/docs/modules/agent_tools.md`, `agent_tools_mcp_server.md` | The Model Router's tools | No change by delivery (already updated) | `submit_runtime_switch` beside `submit_launch_choices`. |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | CM-12, a remote run's start | No change by delivery (already updated) | The node fallback in a peer-started run. |
| `autobyteus-server-ts/docs/modules/README.md` | The module index | No change by delivery (already updated); one overlap with the base | The index line for Run Events merged with the base's own additions without conflict. |
| `autobyteus-web/docs/settings.md` | Settings → Model Routing | No change by delivery (already updated); one overlap with the base | The switch "Switch runtime when a usage limit is reached" and the decision sources "Agent history" and "Node fallback". Merged with the base's edits without conflict. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `run_events.md` (new), `model_routing.md`, `agent_runtimes.md`, `agent_tools.md`, `agent_tools_mcp_server.md`, `collaboration_model.md`, `modules/README.md`, web `settings.md` | Update (code commits) | The hub, the fallback order and retention, the limits read, the router's tool, the node fallback in CM-12, the setting | The ticket's behavior |
| `GLOSSARY.md` | Update (delivery) | The automatic runtime switch | The existing entry described only the person's switch |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The run event hub | A run publishes a moment; listeners act; new kinds add their data shape and listeners without changing runs | `design-spec.md` C-1, `requirements-doc.md` REQ-009 | `run_events.md` |
| The fallback order | Router (40 s) → the agent's history (30 days) → the node's most-used runtime and model → the first usable runtime; each runtime at most once per turn; an exhausted fallback is skipped | REQ-004, REQ-008, SR-011 R-17 | `model_routing.md` |
| What the person sees | One notice row naming the limit, the reset and who chose; the continue message is a labelled system notice; no fallback keeps the run in Error and points to Settings | `design-spec.md` C-5, R-18 | `model_routing.md`, `run_events.md` |
| Who chose | An automatic switch records `model_router`, `agent_history` or `node_fallback`; `settings` stays the person's edit | R-19 | `model_routing.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "A usage limit ends the turn with an error and the run waits for the person" | The automatic switch (setting on by default) | `run_events.md`, `model_routing.md`, `GLOSSARY.md` |
| A delegated run could start on an exhausted default | It starts on the fallback with a launch note | `model_routing.md`, `collaboration_model.md` CM-12 |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verify from the evidence (done: `release-deployment-report.md` § Verification), commit, archive, finalize.
- Notes: no out-of-scope doc problem found; `follow-ups.md` keeps FU-646-01 … FU-646-05.
