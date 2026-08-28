# API/E2E Agent-to-UI Proof Requirement Gap

## Trigger

After API-REV-001 passed the approved read-only platform scope, the user clarified that the desired proof is a complete Brief Studio journey in which:

1. a maintained Brief Studio Agent is explicitly instructed to call the application tool;
2. the actual Agent/runtime calls it rather than the test directly calling MCP;
3. execution logs prove the selected tool name, exact application/binding/producer identity, and returned result;
4. the Agent uses the result in its real workflow; and
5. an ensuing business-state change is observable in the Brief Studio UI.

## Current Evidence Versus Requested Proof

Current API-REV-001 evidence is real but stops earlier than this requested journey. It builds the shipped Brief Studio package and executes authenticated MCP -> exact Team binding/member authorization -> production gateway -> real child worker -> actual `get_brief_context` handler -> application SQLite. It proves the route and handler, but the test itself issues the MCP JSON-RPC call. It does not prove an actual model-backed Agent chose/called the tool, does not correlate an Agent tool-call log with the result, and does not open the Brief Studio UI.

The maintained package already selects `get_brief_context` in both member `agent-config.json` files, and `team.md` says each member begins by calling it. The individual researcher/writer `agent.md` files do not repeat that mandatory first-call instruction. No durable or live test proves prompt compliance.

## Requirement / Design Conflict

The approved requirements and design define `get_brief_context` as read-only and explicitly state that the sample proves platform capability without a new application UI workflow or external UI/API contract change:

- `requirements.md`: UC-007, AC-031, the read-only maintained sample, and “without changing its external UI/API contract.”
- `application-owned-mcp-intended-behavior.md`: the sample is platform proof, not a new application UI workflow.
- `design-spec.md`: the handler reads existing state by immutable caller `bindingId` and remains read-only; “no UI change.”

Therefore “the tool will do something and eventually on the UI it is reflected” needs one precise decision:

- **Option A — read-only call participates in the existing workflow:** the Agent calls `get_brief_context`, logs/result prove the call, then the Agent writes/publishes the normal research/final artifact; existing application projection changes Brief state and the existing UI reflects that downstream publication. The tool itself remains read-only.
- **Option B — tool call directly changes application/UI state:** add a write-capable application tool or a UI projection of tool execution. This changes the approved read-only/security posture and is a requirements/design/implementation expansion.

## Classification

- Primary: `Requirement Gap` — the intended causal relationship between the read-only tool call and UI-observable state is not specified.
- Secondary if Option B is selected: `Design Impact` — application business mutation, idempotency, authorization, validation, lifecycle, and UI contract must be designed before implementation or testing.
- This is not an API/E2E-owned test-only correction. Updating product `agent.md` prompts or adding mutation/UI behavior belongs upstream.

## Recommended Acceptance Proof If Option A Is Intended

1. Individual Brief Studio Agent prompt(s) explicitly require `get_brief_context` as the first application action and require using its returned `briefId`/status as workflow context.
2. Launch Brief Studio through its supported Studio application/API path with a real current package and binding.
3. Run an actual configured provider/runtime Agent, not a direct MCP client. If no provider credential/auth is available, report the blocker rather than substitute a mocked “agent decision.”
4. Capture server/runtime evidence that the Agent emitted `tools/call` for `get_brief_context`, the exact binding/member was authorized, the real worker handler completed once, and the returned Brief identity matches the launched binding.
5. Let the same Agent/Team complete the normal write -> `publish_artifacts` -> handoff -> final publication flow.
6. Correlate the application projection/notification log with that binding and publication.
7. Open the supported Brief Studio browser development surface and assert the resulting brief status/artifact is visible for the same `briefId`/binding.
8. Retain durable automation where deterministic; keep any provider-dependent live journey clearly separate and evidence its configured identity.

## Current Routing Decision

Pause delivery finalization for the expanded user expectation. `/solution_designer` should clarify Option A versus Option B and revise the solution package. If Option A is approved, `/implementation_engineer` should own product prompt changes and any required log/observability seam, then source review returns before API/E2E adds the agent-to-UI journey. If Option B is approved, the full design/architecture cycle is required.

## Subsequent User Direction

The user explicitly authorizes improving the Brief Studio demonstration application itself, including its maintained Agent prompts and application workflow. The requested design should make the application Agent reliably call `get_brief_context` and make that behavior demonstrable rather than relying only on tool selection in `agent-config.json` or the shared `team.md` instruction. Brief Studio is a sample and may be changed freely for a coherent production demonstration.

The minimal recommended design remains Option A unless the solution owner finds a stronger justified demo: add explicit first-call and result-use instructions to the individual Agent prompts, preserve the read-only handler, ensure useful call/result observability, then let the existing artifact publication/projection workflow create the UI-observable state. The revised solution should state exactly what UI element changes and how the same binding/brief identity is correlated from tool result through publication to browser assertion.
