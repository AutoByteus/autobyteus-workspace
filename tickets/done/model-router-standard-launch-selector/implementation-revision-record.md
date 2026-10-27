# Implementation Revision Record — model-router-standard-launch-selector (autobyteus-313)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation.md` (Architecture Design Complete, direct implementation) | N/A | `Initial Baseline` | SR-001 | Implemented; to API/E2E (direct route) |

## Revision Entries

### IR-001 — The Model Router's launch with the app's standard selector, stored with its model settings, named as the app does

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/model-router-standard-launch-selector/handoff-implementation.md`, round 1
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: change sequence 1–3 built (commits `09f99eed32`, `f9c58612e5`, `1357063994`); implementation-scoped checks in the handoff.
- Related solution revision IDs: SR-001
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation of the approved package.
- Approved behavior or requirement IDs affected: REQ-001…REQ-005; AC-001…AC-005; BEH-001…BEH-003.
- Implementation delta: server setting `AUTOBYTEUS_MODEL_ROUTER_LLM_CONFIG`, `ModelRouterLaunch.llmConfig`, checked save
  through `RunModelSelectionService`, GraphQL `llmConfig`, router run created with and reused by runtime + model +
  settings; web Configuration with `ChatModelMenu`/`ChatThinkingControl`/`ChatModelOptionControl` through
  `modelRouterLaunchControls.ts`; the page's runtime-name map replaced by `modelRoutingNames.ts` on all four tabs and the
  problem line; docs and design Case 13; the two Model Routing probes follow the menu and the app's names.
- Changed files or areas: see the handoff's Key Files Or Areas.
- Local validation and result: see the handoff's Checks Run.
- Next recipient or routing: per `get_handoff_rules` (Medium/Low direct route).
- Remaining limitations or risks: RSK-001, RSK-002 (design); live routing with a thinking level is left to API/E2E.
