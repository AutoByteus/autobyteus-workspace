# Docs Sync Report — autobyteus-515: tool search on the AutoByteus native runtime

## Scope

- Ticket: `native-tool-search-515` (Project Task `autobyteus-515`)
- Trigger: code review CRR-001 and test-code review CRR-002 passed after API/E2E `API-REV-001` (Pass, final confidence 94.9%). Route: reviewed (`task_size` Medium, `architectural_risk` High).
- Bootstrap base reference: `origin/personal` @ `4cbf9e7881`
- Integrated base reference used for docs sync: `origin/personal` @ `3722dbb1d8` (76 commits), merged into the ticket branch as `bf5250aef3` with no conflict, before any delivery edit
- Post-integration verification reference: both typechecks PASS and the relevant checks PASS on `bf5250aef3` (`evidence/DEL-01…DEL-04`; `release-deployment-report.md`, Initial Delivery Integration Refresh)

## Why Docs Were Updated

- Summary: a native AutoByteus run's requests no longer carry every tool's definition. They carry the four base tools plus `search_tools` and `call_tool`; every other tool is found by search and called through `call_tool`, and from the call on it is that tool for approval, events and history. Raw traces now record the real tool with a new `called_through` field while the conversation sent back to the model keeps the `call_tool` form. A reader of the old docs would believe every tool is in every request, and would not know why a native request's `tools` differs from the run's tool list.
- Why this should live in long-lived project docs: the glossary words are used by the code, the tests and every later ticket on the native runtime; the library's schema doc and memory design doc are where a maintainer looks for how requests and raw traces are built; the server's tool-exposure doc and `TESTING.md` are where a test author learns what a native request holds.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; the change adds a library feature and a server policy | No change | It holds no rule on tool exposure or request contents. The change keeps its rules: the native policy (which tools are listed) lives in the server backend factory, the mechanism in `autobyteus-ts`, one owner each |
| `TESTING.md` | Project testing guideline | Updated | API/E2E added "File watching on a busy Mac" (`327566836a`). Delivery adds one sentence to the "tools a run gets" row: on the native runtime the tools a run has and the tools a request carries differ, so a test of a native request's `tools` asserts the listed set plus `search_tools`/`call_tool` |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed. The ticket's reports recorded no command that stopped working. The release smoke check runs native runs scripted; it is not part of this ticket's route and is not affected by this change |
| `GLOSSARY.md` | Vocabulary the ticket introduces | Updated (implementation, confirmed) | Three terms: *Listed tool*, *Searchable tool*, *Tool search*; checked against the code (`AgentConfig.listedToolNames`, `AgentToolSearch`, raw trace field `called_through`) |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | How the library builds the request's tools | Updated (implementation, confirmed) | §4.4 (request path through `AgentToolSearch`), §4.5 (the OpenAI normalizer closes only objects that declare properties) and new §4.8 (listed and searchable tools, search, call, memory). Checked against `agent-tool-search.ts` (5 results, exact names first, listed order) and `llm-streaming-response-handler.ts` |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Describes the native baseline and the runtime's tool exposure | Updated (delivery) | The baseline paragraph said the native run gets the four base tools and the rest of its set; it did not say what a request carries. Added the listed/searchable paragraph |
| `autobyteus-ts/docs/agent_memory_design.md` | Raw traces, working context, restore and repair | Updated (delivery) | §6 now says a tool called through `call_tool` has two records (raw: the real tool plus `called_through`; working context: the model's `call_tool` form) and how repair treats them, and that a raw trace without `called_through` reads as before |
| `autobyteus-server-ts/docs/modules/agent_execution.md`, `autobyteus-web/docs/` | Native run lifecycle, web tool card | No change | They do not describe the tools a request carries; the web card code is unchanged (the new web case is a test only) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `GLOSSARY.md` | Vocabulary | Three terms | New words in code and docs |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Design reference | §4.4, §4.5, §4.8 | Request path, normalizer rule, the feature |
| `TESTING.md` | Project testing guideline | Busy-Mac file-watching rule (API/E2E); native request vs run tool list (delivery) | A failing watcher test cost API/E2E hours to diagnose; test authors need the request/run distinction |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Module doc | Listed vs searchable paragraph after the native baseline | The doc's native baseline no longer tells the whole exposure story |
| `autobyteus-ts/docs/agent_memory_design.md` | Design reference | Two-record paragraph in §6 | The memory code changed (`RawTraceItem.calledThrough`, repairer's raw vs model name) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Request vs run tool set | The request's tool set is fixed for the run; add/remove of tools changes only what search finds, so the provider's cache and prefix-bound reasoning stay valid (REQ-006) | `design-spec.md` DS-001, DS-002 | `tool_schema_and_configuration.md` §4.8; `agent_tools.md` |
| Where the policy lives | The base-tool list is the server's native policy (`AUTOBYTEUS_DEFAULT_TOOL_NAMES` passed as `listedToolNames`); the library defaults to listing every tool | `design-spec.md` Change Scope | `agent_tools.md`; `tool_schema_and_configuration.md` §4.8 |
| Two records of one call | Raw traces name the real tool; the working context keeps the model's form | `design-spec.md` DS-003 | `agent_memory_design.md` §6; `tool_schema_and_configuration.md` §4.8 |
| Free-form object parameters on OpenAI-format providers | An object schema without declared properties stays open (`additionalProperties` not set to `false`) so `call_tool`'s `arguments` can hold anything | `implementation-handoff.md` K-1 | `tool_schema_and_configuration.md` §4.5 |
| Testing busy-Mac file watching | `fseventsd` delays or loses watch events and `close()` blocks Node; measure before diagnosing | `api-e2e-execution-coverage-report.md` API-02, API-03 | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Every tool's definition is in every native request" | Listed tools plus `search_tools`/`call_tool`; the rest searchable | `tool_schema_and_configuration.md` §4.4, §4.8; `agent_tools.md`; `GLOSSARY.md` |
| `ToolSchemaProvider.buildSchema` as the only source of the request's tools | `AgentToolSearch.requestToolSchemas` (uses `buildSchema` for named tools and `formatDefinitions` for its own two) | `tool_schema_and_configuration.md` §4.4 |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used; docs changed (above). `DESIGN.md` and `RELEASE.md` are `No change`, with the reasons in the table.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001…FU-008 stay in `follow-ups.md`; the Solution Designer sends them. Delivery added one note to FU-003 and one to FU-008 (what the merged state showed); it found no new problem outside the ticket.
