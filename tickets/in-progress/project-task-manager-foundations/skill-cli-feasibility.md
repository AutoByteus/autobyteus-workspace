# Skill + CLI feasibility — Project/Task management

## Authority and conclusion
PROJ-TASK-MANAGER-20261002-001 / SR-007, 2026-10-02. **Investigation only**, not an approved feature, target architecture, implementation plan or executed proof. User SD-CF-009 asks whether a skill can provide scripts/CLI access to server-owned Tasks instead of direct MCP calls. Sources E-029–032 in investigation-notes.md are pinned to origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061 unless otherwise stated.

**Feasible:** a skill supplies instructions and may bundle executable code; the agent invokes that code through its permitted shell. The code is an HTTP client of the server. Server process ownership of data is not a barrier, and the client must not edit projects.json or recreate persistence/validation logic. A script could be Bash, Python or JavaScript; Bash invocation does not require the client itself to be implemented in Bash. The [Agent Skills specification](https://agentskills.io/specification) explicitly supports optional scripts and host-dependent language requirements.

## Supported candidate journey and boundaries
Candidate actor: externally authored Project Task Manager, or any agent configured with the relevant skill and allowed shell/network access. Goal: identify a Project, reason about TODO work and create/update its Tasks. Trigger: user requests task management. Candidate sequence: read skill → execute bundled client → list Projects → select exact ID → list Tasks with optional status → invoke combined create/update → receive current server-confirmed JSON. Status/creation remain explicit requests, not execution launch or completion inference.

This is a requested **candidate normal journey**, pending DEC-016 delivery approval. No current end-to-end Task-management skill/CLI was found or exercised. Missing server endpoint/configuration, unreachable network, denied access, malformed IDs/status and GraphQL errors must not be reported as success. Script availability does not grant access. Manager/Team creation, scheduling/dependencies, sidebar redesign and resource stopping remain outside this ticket.

## Current foundations and actual gaps
| Concern | Evidence-backed fact | Consequence / limitation |
| --- | --- | --- |
| Skill delivery | ConfiguredAgentSkillResolver resolves catalog names; native prompt append lists absolute SKILL.md paths; Codex/Claude profiles materialize skill source-root links under .codex/skills and .claude/skills | Bundled client resources fit existing skill support; no new skill framework needed in principle. Actual runtime dependency/permission availability still needs verification |
| Shell placement | Native run_bash invokes ShellCommandExecutor child process with selected cwd. POSIX resolver copies process environment; Windows uses WSL | On inspected native POSIX path, code runs in server-host execution environment, not the browser. WSL/container/sandbox network namespaces and other runtime inheritance cannot be assumed identical |
| Runtime configuration | AUTOBYTEUS_SERVER_HOST configures server public base URL; Electron/Docker launch configuration provides it. Codex app-server launch copies a process environment | A usable existing address is a candidate source, not proof every agent shell receives a correctly reachable endpoint. Never hardcode port 8000 or assume public URL/localhost works from every runtime |
| Server API | /graphql exposes projects, projectTasks(projectId), createProjectTask and updateProjectTask description mutation, all backed by current Project services | HTTP client can reuse server ownership/validation/persistence. Existing API has no status mutation or server-side status filter; status writes need server capability. Filtering could be server- or client-side after approval; no placement selected |
| Main API trust | RemoteAccessRoutePolicy classifies POST /graphql as trusted-network protected; ordinary network callers use trusted-network context, mobile credentials when supplied are validated | Not a universal bearer-token API or a per-agent Project/Task permission system. Reuse and explicitly choose the supported trust model; do not invent credentials or publish server broadly |
| Agent Tools MCP | Separate dynamic-port loopback server; active-run session URL, enabled-tool catalog check and tool observers | Direct GraphQL CLI does not automatically inherit selected-tool filtering, collaboration sender identity or structured tool events. CLI wrapper over MCP could reuse these, but session handoff/exposure still needs design |
| Feature flag | Current Projects flag is visibility-only/default-off, not a backend CRUD security control | CLI calls cannot be treated as permission because UI is hidden, and must not turn the flag on. Prior exposure-policy proposal still needs approval |

Exact source files are enumerated in E-030/031; inspected selected source/name searches are not a global proof no unrelated CLI exists. No API/mic/file/agent runtime or installed-data probe performed.

## Two meanings of “MCP to CLI”
| Candidate | Agent-facing experience | Server-side communication | Key tradeoff |
| --- | --- | --- | --- |
| Direct API client + skill | Agent reads skill and invokes client commands | HTTP GraphQL or an approved server API, no MCP needed for these Task calls | Natural for our own server CRUD; must explicitly address runtime configuration, existing trust and loss of MCP session/tool filtering/event semantics |
| MCP client CLI + skill | Agent reads skill and invokes commands instead of direct model tool calls | CLI still calls run-scoped MCP interface | Can retain current per-session tool availability/operation routing; not MCP removal. No automatic access to run session URL/identity inferred |

[Anthropic's code-execution-with-MCP example](https://www.anthropic.com/engineering/code-execution-with-mcp) demonstrates the second distinction: callable code still invokes MCP underneath. This supports a pattern, not an obligation to abandon MCP or a quantified benefit for our three small operations. [Official MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture) distinguishes client/server protocol from transport; its current revision is not claimed compatible with the pinned server's older supported versions.

## Recommendation and decision boundary
For owned Project/Task CRUD, a **small direct-API client plus skill is a reasonable candidate** if the user wants a CLI-first interface. Keep business rules and durable writes server-owned; use explicit Project/Task identity, optional exact status filtering, deterministic errors and machine-readable results. These are feasibility recommendations, not selected modules, schemas, file paths, CLI command names or new security architecture.

Do not convert existing discovery/delegation/collaboration wholesale: their runtime sender/run context is materially different from Project CRUD, and the user did not request replacing them. Do not promise lower tokens, fewer bugs, remote portability, batching, automatic retries or stronger security without tests. Three compact tool schemas may already be inexpensive; skills/scripts also add instructions, shell-output and dependency costs.

DEC-016 needs the user to choose **CLI/skill instead of native/MCP for the new Task capabilities, alongside them, or deferred**. Shipping a reusable access skill/client is distinct from user-owned Manager/team creation, but is not authorized merely by asking this feasibility question. After selection, refine REQ-010/AC-010/021 and supported runtime/trust/configuration/error expectations, obtain complete requirements approval, then architecture. Prior approved manual Projects/Tasks UI/default-off/no-cleanup boundaries remain unchanged.

## Primary source record
Read 2026-10-02: [Agent Skills specification](https://agentskills.io/specification), [host integration guide](https://agentskills.io/client-implementation/adding-skills-support), [MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture), [Anthropic code execution article](https://www.anthropic.com/engineering/code-execution-with-mcp) (published 2025-11-04). No quoted passages, market-wide trend measurement or benchmark transferred to this project.
