# Current authority — SR-006

Canonical active package moved to /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only. Prior sections below are dated historical evidence. SR-006 at the end supersedes SR-005 scope/classification and readiness assumptions. Expanded workspace remains preserved, not the release candidate.

# Investigation Notes

## Investigation Meta

- Package identifier: `agy-mcp-tool-call-presentation`
- Request / ticket: Show the real MCP tool name and arguments for Antigravity (AGY) runs instead of the generic `call_mcp_tool` wrapper.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation` / `codex/agy-mcp-tool-call-presentation`
- Resolved base remote / branch / revision: `origin/personal` @ `5c6fb95ea1c841938326f75d83f6689680df70e6` (fetched 2026-09-30)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree and ticket folder created; no blocker.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Investigation status: Requirements and architecture investigation complete.

## Initial Request And Clarifications

- Original request (user, 2026-09-30, with screenshot of an AGY "Teacher" Org member run): when Antigravity calls an MCP tool, the Activity panel shows `call_mcp_tool` with arguments `{Arguments, ServerName, ToolName}`. The user wants the frontend to show the real tool name and its real arguments (as `send_message_to` etc. appear for other runtimes), suspects the backend adapter is the place, and invited experiments.
- Clarifications received: 2026-09-30 — user confirmed the intent (MCP calls unwrapped and mapped to platform tool calls, showing name, arguments and results), asked for the designer's suggestions, and agreed to them; explicitly stated old history runs are to be left alone.
- User-supplied facts and constraints: Screenshot shows `call_mcp_tool` wrapping `ServerName: autobyteus_agent_tools`, `ToolName: delegate_task`, real arguments nested under `Arguments`; result shown as `{provider_state: "DONE", output: "<JSON text>"}`.
- Initial ambiguity: whether non-AutoByteus MCP servers are in scope and how they are named; whether the result presentation should change; whether already-stored runs should change.

## Product And Domain Understanding

- Product area: Agent run event stream → Activity panel / conversation tool segments, for the Antigravity CLI runtime (`antigravity_cli`).
- Affected actors or systems: Users watching AGY runs (standalone, Team, Org members); server event pipeline consumers that read `tool_name` / `arguments`.
- Existing user or operational purpose: The Activity panel tells the user which tool an agent invoked, with what arguments and what result.
- Relevant terminology: **AGY native tool** (e.g. `view_file`, `run_command`); **`call_mcp_tool`** — AGY's single native tool through which every MCP tool call is made; **AutoByteus agent tools server** — the run-scoped MCP server named `autobyteus_agent_tools`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-30 | User | Request text and screenshot | Problem statement | `call_mcp_tool` shown with wrapper arguments | — |
| 2026-09-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` (`tool()`, lines 86-129) | Where AGY tool steps become run events | `tool_name` is taken verbatim from the provider step; `arguments` is `tool_info.parameters` verbatim. No MCP-specific handling. This is the only producer of AGY tool events (`agy-agent-run-backend.ts:102`). | Architecture phase |
| 2026-09-30 | Code | `src/agent-tools/mcp/agent-tools-mcp-tool-name.ts`; `backends/claude/agent-tools-mcp/claude-agent-tools-mcp-tool-name.ts`; `backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts:41` | Precedent in other runtimes | Codex and Claude strip the `autobyteus_agent_tools` provider prefix so events carry the bare canonical name (`send_message_to`). Third-party MCP names are not rewritten (Claude keeps `mcp__<server>__<tool>`). | DEC-002 |
| 2026-09-30 | Code | `src/agent-execution/events/processors/file-change/file-change-tool-semantics.ts`, `file-change-event-processor.ts:214-300` | Downstream consumers of `tool_name` | `write_file`/`edit_file` names are treated as file mutations; `generate_image`, `edit_image`, `generate_speech`, `generate_video` as generated-output tools that create Files entries. Name mapping therefore has side effects beyond display. | DEC-002, REQ-005 |
| 2026-09-30 | Code | `tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts:53-58` | Existing pinned behavior | A `call_mcp_tool` step with `ToolName: generate_image` must not be treated as AGY's native `generate_image` (no native image path resolution). | Preserve |
| 2026-09-30 | Code | `src/run-history/projection/*` | Replay of stored runs | History replays stored normalized traces; the stored `toolName` is what is shown. | DEC-004 |
| 2026-09-30 | Doc | `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md:134-140` | Runtime documentation | Native tool allowlist; AutoByteus MCP reaches the model through its own authority. Doc will need a sync note. | Delivery docs sync |
| 2026-09-30 | Data | `tickets/done/antigravity-cli-runtime-redesign-20260924/agy-capsule-mcp-probe/stdout.jsonl` (AGY 1.2.10) | Prior raw stream evidence | `tool_info.parameters = {Arguments, ServerName, ToolName}`; `output` is the MCP text content. | Re-verified on 1.2.14 |
| 2026-09-30 | Command | `python3 agy-mcp-call-shape-probe.py` (this ticket folder), AGY `1.2.14` | Verify shape for nested args, JSON result and MCP error on the installed version | See Runtime findings | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | An AGY run's model calls a tool on the AutoByteus agent tools MCP server | Provider streams a `call_mcp_tool` step (ACTIVE then DONE/ERROR); server emits tool started/terminal events; Activity panel shows the item | Item is titled `call_mcp_tool`; arguments show `{Arguments, ServerName, ToolName}` | User screenshot; converter lines 89-95 | High |
| BEH-002 | System | An AGY run's model calls a tool on any other configured MCP server | Same path as BEH-001 | Same generic presentation | Probe (server `shape-test`) | High |
| BEH-003 | System | An AGY run's model calls an AGY native tool | Provider step carries the native name and parameters | Shown with native name and parameters | Screenshot (`view_file`, `run_command`) | High |
| BEH-004 | System | A `call_mcp_tool` step ends in ERROR or carries a provider error | Server emits tool failed (or denied when the message matches a denial pattern) | Failure shown under `call_mcp_tool` | Probe step 10; converter lines 114-118 | High |
| BEH-005 | System | AGY's native `generate_image` completes | Server resolves the native image path from AGY's step output | Only the native tool triggers this; MCP `generate_image` does not | Converter lines 92, 119-122; unit test 53-58 | High |
| BEH-006 | User | User opens a stored AGY run | History replays stored traces | Stored tool name is displayed | `run-history/projection` | Medium (not exercised live) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `backends/antigravity/stream/agy-stream-event-converter.ts` | Sole translation of AGY stream steps into `AgentRunEvent`s | The provider wrapper is visible because nothing unwraps it | Natural owner of the unwrap; native-image detection must stay keyed on the provider name |
| `agent-tools/mcp/agent-tools-mcp-tool-name.ts` | Shared canonical naming for the AutoByteus agent tools server | Precedent: bare canonical names for AutoByteus tools | Reuse vs. AGY-specific helper |
| `events/processors/file-change/*` | Interprets some tool names as file mutation / generated output | Bare third-party names could be misread as platform tools | Naming of third-party tools must avoid collisions |
| Web Activity panel / tool segments | Render `tool_name` and `arguments` from events as-is | No frontend change is needed for the name/arguments to change | Confirm no AGY-specific frontend branch on `call_mcp_tool` (none found by search) |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: `AgentRunEvent` tool lifecycle payloads (`tool_name`, `arguments`, `result`) for AGY runs; stored run traces derived from them.
- Existing readers, writers, or contracts that consume them: event pipeline processors (file-change, team-communication, lifecycle), WebSocket stream to the web app, run-history projection.
- Evidence paths: see Source Log.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: AGY stream converter; shared agent-tools MCP naming helper.
- Existing structural surfaces that can support the approved behavior: the converter's `tool()` method.
- Evidence paths: `agy-stream-event-converter.ts`.

### Potential Structural Impacts To Investigate

- API or external-contract change: None expected (event schema unchanged; values change).
- Persistence schema or invariant change: None expected; new runs store different values in existing fields.
- Security or privacy boundary change: To verify in architecture — Codex redacts agent-tools server details from payloads; AGY currently shows `ServerName` openly.
- Concurrency or lifecycle change: None expected.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: None expected.
- Confirmed absent, present, or unknown: Unknown until design.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| `python3 agy-mcp-call-shape-probe.py` (AGY 1.2.14, `gemini-3.8-flash-low`, disposable temp capsule with a stdio MCP server `shape-test`) | Call with nested arguments | ACTIVE and DONE steps both carry `tool_name: call_mcp_tool`, `tool_info.parameters = {Arguments: {note, options:{count,tags}}, ServerName, ToolName}`. The MCP server received exactly the `Arguments` object. | Real name and arguments are available at start and at completion | `agy-mcp-call-shape-probe/stdout.jsonl`, `summary.json`, `mcp-server-messages.jsonl` |
| same | Call with no arguments | `Arguments: {}` | Empty arguments must present as empty | same |
| same | Tool returns JSON text | `tool_info.output` is the raw text string of the MCP content | Result remains provider text unless DEC-003 changes it | same |
| same | MCP tool returns `isError: true` | Step state `ERROR`; `tool_info.error = {type: "TOOL_ERROR", message}`; `output` repeats the message; parameters still present | Failed calls can also be presented under the real name | same |
| same | Schema lookup | Before each MCP call AGY issues a native `view_file` on `~/.gemini/antigravity-cli/mcp/<server>/<tool>.json` | These remain native `view_file` items; not in scope | same |

Probe side effects: AGY wrote three schema files under `~/.gemini/antigravity-cli/mcp/shape-test/`; removed after the run. AGY's own conversation folder for the probe under `~/.gemini/antigravity-cli/brain/` was left in place.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User | See the real tool name and arguments for AGY MCP calls | Direct request | REQ-001, REQ-002 | DEC-001..004 |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| AGY CLI `stream-json` step shape for `call_mcp_tool` | Observed on 1.2.10 and 1.2.14; not documented by the provider | `parameters.{ServerName, ToolName, Arguments}` | Probes | Shape may change in a future AGY version; behavior when fields are missing must be defined (REQ-004) |

## Persisted Data And State Facts

- Affected stored or external subject: Stored traces of AGY runs.
- Location and representative shape: per-run trace records holding tool name, arguments, result.
- Approximate volume: Not measured.
- Current readers and writers: event pipeline writes; run-history projection reads.
- Current unknown/extra-field behavior: N/A.
- Required semantics or data that must be preserved: Existing stored runs remain readable.
- Acceptable loss, reset, rebuild, or regeneration: Proposed — existing stored runs keep showing `call_mcp_tool` (DEC-004).
- Privacy, retention, compliance, downtime, or operational constraints: None identified.
- Remaining evidence gap: Exact trace storage path for AGY runs (architecture phase, only if DEC-004 changes).

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- Remaining fields: N/A — not applicable.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `agy-mcp-call-shape-probe.py` | Solution Designer | Disposable AGY stream-shape probe | Evidence only | REQ-001..004 | Complete | Not behavior-defining; no approval needed |
| `agy-mcp-call-shape-probe/` (`stdout.jsonl`, `summary.json`, `mcp-server-messages.jsonl`, `stderr.txt`) | Solution Designer | Raw probe output | Evidence only | REQ-001..004 | Complete | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | AGY may change the undocumented `call_mcp_tool` parameter shape | Unwrapping could silently fail | Defined fallback (REQ-004) | Open |
| RSK-002 | Risk | A third-party MCP tool named like a platform tool (`write_file`, `generate_image`) would be misinterpreted if shown under a bare name | Wrong Files entries | DEC-002 | Open |
| UNK-001 | Unknown | Whether AGY MCP media tools currently produce Files entries by another route | Determines whether REQ-005 is a visible change | Resolved: no production code recognizes `call_mcp_tool`, so none today. After the change a Files entry appears when the media tool's arguments carry an explicit output path (`file-change-output-path.ts`); accepted by DEC-005 | Resolved |

## Architecture Investigation Findings

Recorded 2026-09-30 after requirements approval.

- `grep -rn call_mcp_tool` over `autobyteus-server-ts/src` and the web sources (excluding build output): no production code keyed on `call_mcp_tool`. Only tests and `docs/modules/antigravity_cli_runtime.md:137` mention it.
- `agy-stream-event-converter.ts:95-100`: one `common` payload per step index is reused for start, terminal and background-close events, so projecting while building `common` gives the same name and arguments across the call.
- `agent-memory/services/runtime-tool-trace-sequencer.ts:145-152` and `run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:96` read `provider_state` and `output` from the AGY result. The `{provider_state, output}` result shape must stay; `output` may be structured.
- `web` also reads `provider_state` in `services/runHydration/runProjectionConversation.ts:164` (denied classification) — unaffected.
- `src/agent-tools/mcp/mcp-effective-tool-result-projector.ts`: the shared projector parses single JSON text blocks for Codex/Claude/Grok but takes an MCP `{content: [...]}` envelope and a provider union without AGY. AGY delivers flattened text, so a local JSON-text projection is the fitting shape.
- `file-change-tool-semantics.ts`: exact-name matching. `mcp__<server>__<tool>` never matches a platform name. Bare AutoByteus media names match the generated-output set; with the AGY result shape the output path is found only from explicit output-path arguments.
- `capsule/agy-mcp-config-materializer.ts`: a workspace or global MCP server named `autobyteus_agent_tools` is rejected before the run starts, so that server name is unambiguous inside a run.
- Tests pinning current presentation: `tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts:496, 519, 873` assert `tool_name === "call_mcp_tool"`. `tests/unit/.../agy-stream-event-converter.test.ts:53-58` uses a wrapper without `ServerName` and stays valid as the fallback case.
- No persisted-data migration is designed, so the repository migration-convention check does not apply.

## Requirement Implications

- The real tool name and arguments are present in every provider step for an MCP call (start, success, failure), so the desired presentation is feasible without provider changes.
- Tool names are interpreted by server processors, so the naming rule for non-AutoByteus servers is a product decision with side effects, not only a label choice.
- The existing guard that an MCP `generate_image` is not AGY's native image tool must be preserved.

## Notes For Architecture Design

- Scenarios to realize after approval: SCN-001..SCN-004 in `requirements-doc.md`.
- Verify: whether AGY event payloads should redact agent-tools server details as Codex does; UNK-001; any frontend code keyed on `call_mcp_tool` or `agy-tool-` invocation ids.


## SR-003 — Delivery source-scope recovery investigation (2026-10-01)

Trigger: DR-002 Blocked — Unclear source ownership/scope, returned by Delivery Engineer. Read release-deployment-report.md, delivery-revision-record.md, handoff-summary.md and delivery-evidence/resumption-20261001/source-inventory.json before investigating.

Commands: git status --short on server-e2e-suite-repair; git diff for the three dirty AGY-worktree production files, package.json and TESTING.md; byte comparison of all 25 inventoried paths against the server-e2e-suite-repair worktree; targeted ticket-document search.

Observed: another dirty worktree exists at `/Users/normy/autobyteus_org/autobyteus-worktrees/server-e2e-suite-repair`, branch `codex/server-e2e-suite-repair`. Many E2E files and root package.json exactly match the unexplained AGY-worktree versions. The three production-file versions do not match. No matching canonical server-e2e-suite-repair ticket directory was found under that worktree's tickets tree. This supports overlap with suite-repair work, but does NOT establish its author, approval, readiness, or disposition, nor prove that the extra production changes are preserved there.

| Inventoried AGY worktree path | Comparison with server-e2e-suite-repair |
| --- | --- |
| `TESTING.md` | Different |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Different |
| `autobyteus-server-ts/src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-history-candidate-plan.ts` | Different |
| `autobyteus-server-ts/src/run-history/services/team-run-history-catalog-service.ts` | Different |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/agent-definitions/json-file-persistence-contract.e2e.test.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | Different |
| `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/helpers/studio-application-api-services.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/run-history/nested-team-history-restart.e2e.test.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Identical contents/deletion |
| `autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts` | Different |
| `autobyteus-server-ts/tests/integration/file-explorer/file-explorer.integration.test.ts` | Different |
| `autobyteus-server-ts/tests/integration/file-explorer/nested-folder-move-watcher.integration.test.ts` | Different |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-service.test.ts` | Different |
| `autobyteus-server-ts/tests/unit/app-data-migrations/agent-org-flat-team-families-v1-app-data-migration.test.ts` | Different |
| `autobyteus-server-ts/tests/unit/file-explorer/file-explorer.test.ts` | Different |
| `package.json` | Identical contents/deletion |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-config-graphql.e2e.test.ts` | Identical contents/deletion |

Production diff confirms extra strict-history preflight and current unversioned-tree migration recognition. Neither belongs to the approved AGY converter change merely because E2E tests expose it. TESTING.md mixes two AGY rows with an additional E2E build note. All source remains untouched; Delivery's full patch/snapshot and original worktree remain the preservation authority.

Conclusion: approval and AGY design remain SR-002; no requirement/design change proposed. Delivery candidate selection remains blocked pending explicit user disposition of the extras. Recommend a separate clean finalization worktree for the approved AGY commits/docs only, leaving all unknown edits in their original worktree and snapshot; this recommendation is NOT yet an authorization or execution claim. User should decide release-only-AGY versus inclusion/recovery of the additional work. No tests rerun.


## SR-004 — Recovered API/E2E repair provenance (2026-10-01)

This corrects SR-003's unresolved ownership assessment using newly located evidence, rather than rewriting history. User asked whether these were repairs requested after API/E2E found failures.

Primary source: `/Users/normy/.claude/projects/-Users-normy-autobyteus-org-autobyteus-workspace-superrepo/324bd068-ef49-4160-8c9b-decec8371cdc.jsonl`, the original API/E2E conversation beginning with the AGY implementation handoff. Durable selected excerpts and archived original test logs are in `recovery-evidence/test-repair-provenance-20261001/` (see archive-manifest.json for hashes).

### Recovered chronology (2026-09-30, Europe/Berlin)
- 11:41 (source line 315): user explicitly asks to investigate/fix the 43 failures, update obsolete tests and distinguish stale tests from actual defects.
- 12:16 (992): engineer reports separate `codex/server-e2e-suite-repair` branch: 50 baseline failures in 14 files repaired; 239 E2E tests pass. Reports two genuine product defects involving unreadable Team history index, orphan package and migration retry. At this stage a regression is marked `it.fails`, so that green suite alone is not proof of fixed product defects.
- 12:25 (995, 998, 1015): after the engineer explains the defects/unit/integration gaps, user explicitly requests repairs on the current ticket so they ship to personal with it.
- Source command 1026 explicitly exports repair.patch from the repair worktree and applies it to the AGY ticket worktree. Commands 1063/1073 introduce the currently observed history-index preflight and current-format Team recognition, add focused unit tests and change the migration E2E from expected-failure to normal assertion.
- 12:28–12:32 (1077, 1088): `pnpm test:e2e` runs on AGY ticket after source fixes: archived agy-after.log shows 66 files / 239 tests passed, 30 files / 123 tests skipped, no failures. This differs from the repair-only branch's 29/122 skips because the AGY branch includes an additional opt-in test.
- Subsequent unit/architecture baseline: 29 files / 78 tests failed, 552 files / 3948 tests passed, 3 files / 6 tests skipped, 4 unhandled errors. Integration: 18 files / 49 tests failed, 50 files / 264 tests passed, 17 files / 67 tests skipped.
- Commands 1133/1151 repair one Team service integration mock and three file-explorer imports. Focused two production unit files: 37 passed (`unitfix.log`); final three file-explorer files: 14 passed (`one.log`). Full unit/integration suites were not shown rerun green afterward.
- 12:34 user requests Electron test app (1098); 12:40 engineer reports isolated instance iso-52483-84f0 includes both AGY fix and the two production fixes. The user's later testing confirmation is consistent with that combined build, but exact tests performed remain unspecified.
- Final repair report (1176) explicitly states changes uncommitted, Delivery Engineer not informed and ticket validation reports not updated. Further unit/integration work awaits continuation.

### What this resolves and what it does not
The extra edits are not arbitrary contamination: they trace to the original API/E2E execution and explicit user-directed test repair on this ticket. Historical user intent to include them is now evidenced; do not assume AGY-only separation is the desired delivery. Earlier SR-003 recommendation was based on missing provenance and must not be executed automatically.

Test-only repairs address flat-Team schemas/handoffs/revisions, history admission fixtures, Team-to-Org migration expectations, idle run-manager mocks, build prerequisites and token-usage database isolation. Two fixes change production behavior: reject a new Team run before writing its package when the history index is unreadable, and allow migration retry to leave valid current unversioned flat Team trees alone.

Canonical requirements/design/implementation/API reports still describe only SR-002/IR-001/API-REV-001. Recovered approval history must be reconciled into a completed expanded solution package; source/migration investigation, design/risk classification and ownership-compliant validation remain necessary before declaring combined release-ready. Original Small/Low applies only to AGY scope, not automatically to added migration behavior. No source edit or test rerun in this lookup. Current 25 inventoried source paths match DR-002 hashes/deletion exactly, recorded in current-source-vs-dr002.json; this proves preservation, not equivalence to a historical validated revision.


## Latest-base refresh prerequisite — 2026-10-01
User interrupted solution recovery to require latest origin/personal first. Fetch succeeded at b0b077b02571098a6bf7993ab46b67a69fdb8f9d; task was 3 ahead / 42 behind. Verified 25 DR-002 inventory entries unchanged and created explicit local WIP preservation checkpoint 9038c218b with those edits and existing investigation/revision updates. Merge now in progress with two test conflicts (flat-Team test rename versus skill removal; Org-history expectations versus skill removal), no source resolutions performed. Details and exact state: latest-base-refresh-request-20261001.md and recovery-evidence/latest-base-refresh-20261001/. Delivery continuation requested to complete integration before expanded solution authoring. No new requirements/design approval or classification claimed by this workspace step.


## SR-005 — Canonical combined-solution recovery after latest-base integration

### Approval and workspace gate

Read incoming DR-003 report, delivery revision record, release report and validation-results.json before acting. User's recovered explicit approval to repair the failed tests and include both explained defects on this ticket, plus current instruction to continue/trigger handoff after the combined-scope summary, is now formalized in requirements-doc.md at SR-005. No claim the SR-005 document existed or was approved in September. Latest-base prerequisite fulfilled: a01cadaea contains b0b077b02 (verified ancestor and 6 ahead / 0 behind); no unmerged entries; production/test code clean. No further source edits or tests performed by Solution Designer.

Requirements were recovered/persisted first. Architecture then extended against integrated source and the canonical migration conventions. This is not a fresh user-behavior proposal: it preserves the two explicitly explained defect outcomes and evidence-led test repair, with new product defects routed rather than silently included. Source code and historical tests are evidence, not requirements authority.

### Architecture reads and observations

| Source / command | Observation / design relevance |
| --- | --- |
| `git merge-base --is-ancestor origin/personal HEAD`, rev-list, source diff | b0b077b02 included; 33 source/test/docs/package changed paths, not just AGY; exact list/stat in recovery-evidence/solution-recovery-sr005/ |
| TeamRunService.createTeamRun and createTeamRunFromRootConfig | Common lifecycle owner; current preflight immediately before manager creation preserves root-config path; post-create failure still terminates existing managed run |
| TeamRunHistoryCatalogService / CollaborationRunHistoryCatalogCore / TeamRunHistoryIndexStore | Catalog owns index, strict initialization/read rejects malformed data without overwrite; ENOENT is valid empty snapshot; per-store write queue and family catalog queue already exist; no new global precondition needed |
| `docs/design/data_migration_guideline.md` blob 02999a6c80b7df63443c70bc101becd00cc72613, last file commit 380876bc0 | Authoritative sections 1–10 read; no historical lockout, frozen source classifiers, same-ID pending/failed correction, terminal skip, bounded actual recovery, current admission independent |
| V1 migration entry/promoter family, V2 entry, frozen released-run-package-shapes README/schema | V1 may warning-complete with retained invalid history/index; V2 can skip missing trees and classify current/released V2. Directory existence or successful predecessor is not blanket source validity |
| Existing Org cutover entry, candidate planner, released-team-run-v2-schema | Flat roots zero-write, missing tree bounded warning, invalid/family collision failure, partial-target/index-only plans, existing context/token/history transitions and source retirement. Do not replace aggregate policy or target conversion |
| AppDataMigrationRunner.runPending/recoveryAction, current RootRunPackageReadinessIndex | Terminal SUCCEEDED/SUCCEEDED_WITH_WARNINGS skipped; startup-only failed status gives restart-to-retry; current admission scans actual package structure and does not admit based solely on ledger |
| Current Team tree schema bf0bfe713b1d1644a20ea2f163f7fa9d77bd96ae; shared schema b69359837b92b9b36698f2688c99395462ddd56f | Live tolerant reader and exact writer; current launch shape has no skill mode, optional-on-read collaborators now included with task-delegator/address/run identity invariants. New cutover helper currently imports this mutable source validator: technical design flaw to correct via frozen recognition |
| Current versus pre-integration source and frozen released schemas | Multiple investigated unversioned cohorts exist; prior skill/settled fields and new collaborators cannot be blindly removed from released input/output. Freeze source predicates/types by pin; current API projections remain current-only |
| TESTING.md, Vitest config, prisma-env/global-setup, Brief Studio package.json | Active *.test.ts suite, forked serial files, test database reset/setup; run phases must not race on one DB; built-server tests need fresh build; Brief Studio integration needs pack artifact |
| AgentRunManager, WorkspaceConverter, media-storage-service and historical error inventory | Explicit complete dependency/initialize-release contracts; workspace.metadata; relative /rest/files output. These support fixture/setup repair, not restoring obsolete production defaults |

### Design decisions and verification limits

- Two product spines beyond AGY: pre-side-effect catalog readability and existing failed cutover retry. No new migration ID, schema, index format, startup gate, data deletion or runtime legacy decoder.
- Frozen migration classifier replaces the provisional live current-schema dependency. Independent architecture review should scrutinize known source cohorts, current collaborators/old optional fields, zero-write semantics and no-loss/availability boundaries.
- Size Large / risk High because actual multi-subsystem test/source scope and persisted history classification/admission, not document count. Former Small/Low retained only as SR-002 history.
- Recovered 47-file historical unit/integration inventory is not a new execution result. DR-003 build/210 focused pass +13 E2E pass are current focused evidence; full suites and realistic final journeys still downstream. Some failures may need additional requirements/design recovery; do not call all historical cases stale.
- Real installed data volume/performance not measured and operational profile not accessed. Existing faithful released fixtures and real built-server tests provide bounded evidence. No arbitrary performance target or speculative journal designed.

### Supplement inventory (cumulative, current at SR-005)

| Path relative to ticket | Owner / purpose / scope | Related IDs | Status / approval applicability |
| --- | --- | --- | --- |
| agy-mcp-call-shape-probe.py, agy-mcp-call-shape-probe/ | Solution evidence, AGY raw shapes | REQ-001..007 | Evidence only; original approval unaffected |
| api-e2e-evidence/ and API reports/ledger | API/E2E historical original validation | AC-001..008 | API-REV-001, not full expanded scope |
| delivery-evidence/resumption-20261001/ | Delivery preservation patch/snapshot/inventory | All repair paths | Preserve immutable evidence, not pass |
| recovery-evidence/test-repair-provenance-20261001/ | Solution recovered exact approval/repair commands and logs | REQ-008..011 | Exact user texts establish historical scope; logs historical only |
| latest-base-integration-result-20261001.md; delivery-evidence/latest-base-20261001/ | Delivery DR-003 integrated/focused proof | AC-001..011 subset | Current at a01cadaea; full-suite evidence absent |
| test-repair-scope-inventory.md | Solution finite 47-file cohort and current owners | REQ-010/011 | Evidence/scope index; requirements govern all intended behavior |
| recovery-evidence/solution-recovery-sr005/ | Solution prior snapshots, source pins/diff, inventory | All | Historical snapshots expressly non-authoritative; current canonical docs separate |
| source-scope-recovery-20261001.md, test-repair-provenance-result-20261001.md, latest-base-refresh-request-20261001.md | Solution recovery chronology | SR-003/004/005 | Prior unknown-ownership/AGY-only-separation recommendation superseded by recovered intent |
| user-finalize-release-request-20261001.md | Solution exact user testing/release direction | Delivery | Initial confirmation, not refreshed final-state verification |

No Product supplement. Combined independent review not yet performed; original review artifacts N/A only for the original direct route.


## SR-006 — Explicit original-scope restoration, 2026-10-01

### Evidence and approved intent (distinct from design)
Read incoming `code-review-report.md` CRR-002 and current solution handoff, requirements, design, revision and investigation before acting. CRR-002 closes CR-F001 but returns inherited API-F001 structural composition conflict; it reports source/guards byte-identical to base and does not establish wrong decisions, data loss or duplicate catalogs. Independently ran `git diff origin/personal --` for that catalog and both architecture guard files: empty. This verifies inheritance only, not test pass or risk waiver.

User then explicitly approved our proposed original-only release scope; exact text and accepted proposal in `user-original-scope-approval-20261001.md`. User reports original personal built product works. Retire added REQ-008..011/AC-009..014 from this release; preserve history and broad work. Do not label recovered user-requested repairs as unrelated provenance: they are deliberately deferred by renewed user direction. Original requirements and scenarios are retained, not re-invented. Requirements were persisted Approved at SR-006 before rebuilding authoritative design.

### Bootstrap and architecture investigation
- `git fetch origin personal` succeeded; ref remains b0b077b02571098a6bf7993ab46b67a69fdb8f9d. Created isolated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation-only`, branch `codex/agy-mcp-tool-call-presentation-only`, from that ref. HEAD is exactly base; no source patch applied by Solution Designer. Final target remains origin/personal.
- Preserved expanded worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation`, HEAD a727971dabab141a39404a00ca6f7db46696f0b9, all existing dirty/untracked contents. No reset/clean/commit/push or runtime execution. Copied full ticket history/evidence to new package; pre-reset owned authority snapshots, entire tracked dirty binary patch (including migration assertion), status and hash manifest in `recovery-evidence/scope-reset-sr006/`.
- Read original SR-002 archived requirements/design and original commit stats (34b310118 six source/test/doc files; ff016088b three AGY test/fixture paths plus many ticket artifacts). Read full base-relative AGY converter diff and 37-line projection helper; current converter delta remains only name/arguments/output adaptation, no lifecycle ownership move.
- Read latest-base generic replay transformer and trace-sequencer paths: stored tool name/arguments and existing result shape are consumed without AGY wrapper unwrapping. Original data decision remains Directly Usable — No Migration; old histories intentionally unchanged. No migration design performed.
- Read new fake transport test shape, fixture diff and current GraphQL inputs; current source uses removed-skill-free API. Original-only recovery must retain this latest-base alignment rather than transplant obsolete input.
- Inspected complete base-relative changed-path inventory: broad Team/history/migration/test/harness/package changes cannot enter by merging the current branch. Scoped file allowlist contains nine whole files and two AGY command rows in TESTING.md. Existing broad test helpers may have hidden dependencies; Implementation must check selected tests against baseline helpers, not silently import the repair cohort.
- Read server AGENTS.md and latest-base TESTING.md: smallest proving layer plus API journey, real-provider prerequisites and isolation, full real-product path via isolated desktop; no user's operational profile testing. Fresh builds required for built-server tests. No tests run in this solution round.

### Completed technical decision and remaining uncertainty
Restore original converter-owned projection on a clean latest-base branch. Small/Low: two local production files; no API/schema/persistence/security/concurrency/host ownership change. More historical documentation/evidence does not enlarge runtime blast radius. Existing unrelated architecture defect does not automatically make this bounded change High, but any AGY dependency or new contract change escalates. Excluded history/migration fixes are not prerequisites for projection. Validation owners must establish actual independent behavior on the new candidate; existing reports cannot be relabelled passing.

### Current supplement inventory and authority
All relative paths below resolve in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/agy-mcp-tool-call-presentation-only` unless explicitly historical absolute links point to the preserved worktree.

| Artifact | Owner / purpose | IDs / status / approval applicability |
| --- | --- | --- |
| user-original-scope-approval-20261001.md | Solution; exact scope-reset direction | SR-006 explicit approval; no behavior-defining supplement |
| recovery-evidence/scope-reset-sr006/ | Solution; pre-reset authority, source status/patch, SHA-256 preservation, base pin and extraction allowlist | Evidence/technical scope only, not implementation or validation pass |
| agy-mcp-call-shape-probe.py and agy-mcp-call-shape-probe/ | Solution original provider evidence | Original REQ-001..007; historical provider version |
| solution-revision-record.md | Solution cumulative chronology | SR-001..006 retained, earlier scopes superseded only prospectively |
| design-review-report.md, architecture-review-revision-record.md | Independent ARCH-REV-001 | Historical expanded SR-005 review, not required/current SR-006 pass |
| implementation-handoff.md, implementation-revision-record.md, implementation-test-repair-ledger.md, implementation-evidence/ | Implementation IR-001/002 | Historical candidate evidence; awaiting new narrow implementation |
| code-review-report.md, code-review-revision-record.md, code-review-evidence/ | Reviewer CRR-002 failure-origin evidence | API-F001 deferred; CR-F001 closed only on expanded candidate |
| api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-revision-record.md, api-e2e-test-case-ledger.md, api-e2e-evidence/ | API/E2E cumulative original and expanded proof | Historical API-REV-001/002; not new-candidate validation |
| delivery-revision-record.md, release-deployment-report.md, handoff-summary.md, docs-sync-report.md, release-notes.md, delivery-evidence/ | Delivery historical preparation/integration | DR-003 NOT Delivery Completed; historical release notes are NOT this candidate's release scope |
| latest-base-integration-result-20261001.md, test-repair-provenance-result-20261001.md, test-repair-scope-inventory.md, recovery-evidence/ other directories | Recovered chronology and expanded repair inventory | Preserve as deferred evidence, no current repair mandate |
| user-finalize-release-request-20261001.md | Initial verification/release request | Not refreshed verification of SR-006 candidate |

No Product handoff/supplement. Current independent architecture/source review N/A under classified Small/Low direct route; applicable executable validation/test review/delivery gates remain. All specialist artifacts copied unchanged as historical context, not rewritten by Solution Designer.

### SR-006 new-ticket bootstrap clarification
User explicitly requested a new ticket for selective original-change application and renewed testing, with broader failure repairs left to a future ticket. Active ticket is now `agy-mcp-tool-call-presentation-only`, in its already-created matching worktree/branch. Copied earlier reports/evidence are parent-ticket ancestry, not current passes. The relocated active ticket contains all context; old absolute evidence links continue to refer to preserved parent artifacts. No future broad-repair task is started by this instruction.
