# Docs Sync Report

## Scope

- Ticket: `grok-release-smoke-551` (Project Task `autobyteus-551`: why Grok failed the release smoke), `task_size: Medium`, `architectural_risk: High`, route: reviewed (architecture review ARCH-REV-001 Pass on SR-001/SR-002; code review CRR-001 Pass, average 9.5; API/E2E `API-REV-001` Pass at 95.5%; test-code review CRR-002 Pass).
- Trigger: the code reviewer's handoff after the post-API/E2E test-code review (CRR-002 Pass).
- Bootstrap base reference: `origin/personal` @ `df00f97aaa` (the v1.5.14-beta.7 version bump).
- Integrated base reference used for docs sync: `origin/personal` @ `dcb855728c` (9 commits: the beta.7 release record and autobyteus-602's test-only fix of TF-04), merged into the ticket branch as `abe2e87fcc` before any delivery edit. No conflict, and no file changed by both sides.
- Post-integration verification reference: ticket branch `abe2e87fcc`: both typechecks PASS at baseline, 554 runtime-management, ACP, Grok, DeepSeek and llm-management unit tests PASS, the scripted Grok replay E2E (11 cases, including the 35 s `initialize` case) PASS (see `release-deployment-report.md`).

## Why Docs Were Updated

- Summary: three causes made Grok fail the release smoke (`investigation-notes.md`): the 15 s and 30 s start-up bounds were too short for Grok's own slow start on a loaded machine; discovery read Grok's built-in start-up model list (`grok-4.6`, `grok-4.5`) instead of the real list it announces about 0.5 s later; and Grok loaded no workspace skills because the workspace was not trusted. The code now bounds `initialize` at 90 s (all ACP agents), waits up to 3 s for `_x.ai/models/update`, and starts a Grok run (not discovery) with `GROK_FOLDER_TRUST=0`.
- Why this should live in long-lived project docs: the next change to the ACP connection, the discovery handshake or the Grok launch profile must know the two bounds, the cost of the 3 s wait on every catalog read and run start, that the wait is never a time-out, and what workspace trust makes Grok load (hooks, MCP and LSP servers, instructions, permission rules): a security-relevant decision (DEC-003, decided by the user).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Owner of the ACP layer description, the Grok capability and launch profile | Updated | By the implementation: the 10 s probe bound, the 90 s process bound, the 3 s announcement wait and its cost, run-only workspace trust and what trust loads. By delivery: the source-layout row now names the two connection bounds (`AGENT_START_TIMEOUT_MS` 90 s, `REQUEST_TIMEOUT_MS` 30 s) and the connection-wide notification listener the discovery handshake uses; the Skills section says why the run is trusted; the Known-limits "Protocol drift" bullet names the new Grok-owned names (`_x.ai/models/update`, the queue and turn signals, `GROK_FOLDER_TRUST`) and how the live suites would show a change (RSK-003). |
| `autobyteus-server-ts/docs/modules/deepseek_harness_runtime.md` | DeepSeek shares the neutral ACP connection and the discovery handshake, so its start-up bound changed too | Updated | One sentence in "Models": its discovery process and a run's `initialize` use the shared 90 s bound, so a dsh that never answers fails after 90 s, not 15 s (a risk the reviews recorded). |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Describes the Grok probes and the billing extension request on a short ACP process | No change | It carries no bound for either; `grok_build_runtime.md` (which it links) holds them. |
| `GLOSSARY.md` | Terms for the change (trust, announced catalog) | No change | The change adds no domain term; "provider-started turn" and the rest are unchanged. |
| `DESIGN.md`, `docs/design-cases.md` | Project design rules and cases | No change | No new rule. The design case (a provider's start-up answer can be provisional; read its announcement) is the Solution Designer's to add (its skill's Recovery); noted in the terminal message. |
| `TESTING.md` | Gated live suites, the test vault, Docker and isolation rules, rerun by impact | No change | Followed as written. The smoke runs used the live suite's own gates and the host sign-ins; the scripted `initialize` case is an ordinary replay case. The reports record no command that no longer works. |
| `RELEASE.md` | The release smoke section (Grok quota, the models line, waiver rule) | No change | Still accurate: Grok still pins `grok-4.7` when offered and otherwise the first model offered; the free-tier quota and the waiver rule are unchanged. After this change the stale-list failure it used to explain should stop; the next release smoke is the check (DEC-006). |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Behavior correction and clarification | See the first row above (implementation text confirmed against the code: `AGENT_START_TIMEOUT_MS = 90_000`, `REQUEST_TIMEOUT_MS = 30_000`, `DISCOVERY_TIMEOUT_MS = 90_000`, `PROBE_TIMEOUT_MS = 10_000`, `GROK_MODELS_UPDATE_WAIT_MS = 3_000`, `GROK_BUILD_RUN_TRUST_ENV = { GROK_FOLDER_TRUST: "0" }`, `runLaunch` trusted and `discoveryLaunch` not). | The doc described 15 s and 3 s bounds, discovery from `initialize` alone and untrusted runs. |
| `autobyteus-server-ts/docs/modules/deepseek_harness_runtime.md` | Behavior correction | The shared 90 s start-up bound for DeepSeek discovery and run start. | The bound is shared, so DeepSeek's behavior changed without a code change of its own. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Start-up bounds | `initialize` waits 90 s for every ACP agent (Grok's own start-up has taken up to 34.6 s loaded); the other short requests keep 30 s; a silent agent still fails clearly, at 90 s. | `requirements-doc.md` (REQ-001, DEC-001), `design-spec.md`, `evidence/API-01-slow-initialize/` | `grok_build_runtime.md`, `deepseek_harness_runtime.md` |
| The announced catalog | Grok answers `initialize` with its built-in list while its sign-in is expired and announces xAI's list (`_x.ai/models/update`) about 0.2 to 0.5 s later; discovery waits up to 3 s after the answer, takes the announced list, never turns the wait into a time-out, and pays the whole 3 s on every catalog read and run start when the sign-in is fresh. | `requirements-doc.md` (REQ-002, DEC-002), `evidence/SD-probes-2026-11-22.md`, `evidence/API-04-smoke/` | `grok_build_runtime.md` |
| Run-only workspace trust | A Grok run's process gets `GROK_FOLDER_TRUST=0` so Grok loads the workspace's own skills; trust also loads the workspace's Grok hooks, MCP and LSP servers, instructions and permission rules and the user's own hooks; nothing is written (`--trust` is never used); discovery and billing stay untrusted. | `requirements-doc.md` (REQ-003, DEC-003 decided by the user), `implementation-handoff.md` | `grok_build_runtime.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `INITIALIZE_TIMEOUT_MS` (30 s, shared by `initialize` and the other short requests) | `AGENT_START_TIMEOUT_MS` (90 s, `initialize`) and `REQUEST_TIMEOUT_MS` (30 s); no alias | `grok_build_runtime.md` (source layout) |
| The 15 s discovery bound and the 3 s Grok probe bound | 90 s and 10 s | `grok_build_runtime.md` (Availability, models) |
| Discovery reading only `initialize._meta.modelState` | `followUp ?? modelState` (the announced list wins) | `grok_build_runtime.md` (Model catalog) |
| Untrusted Grok runs (workspace skills invisible at session start) | `GROK_FOLDER_TRUST=0` on run launches only | `grok_build_runtime.md` (Process, Skills) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not used. Docs impact: `Updated`.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence (done, see `release-deployment-report.md`), archive, finalization onto `origin/personal`, no release.
- Notes: the ticket's `follow-ups.md` rows FU-001 (report Grok's slow start-up step to xAI) and FU-002 (tell the owner of `autobyteus-567` that the cause of the model-list drift is answered) are the Solution Designer's own notes ("written down"), in its own table layout; delivery added none and did not change the file.
