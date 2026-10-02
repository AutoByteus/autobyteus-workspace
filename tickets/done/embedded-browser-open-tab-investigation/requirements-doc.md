# Requirements Document

## Document Status
- Package: embedded-browser-open-tab-investigation; SR-005; approved behavior baseline SR-001 (evidence through SR-004); 2026-10-02.
- Owner: Solution Designer.
- Status: Approved.
- Approval AP-001: user, 2026-10-02, “Well, since you found the problem then go ahead. Now, you are approved now.” Applies to the explained narrow correction REQ-001–003 / AC-001–003, BEH-001–004 / SCN-001–004 (SR-001 behavior baseline, evidence through SR-004). No broader recovery/error-policy redesign or release/finalization approval inferred.
- Behavior-defining supplements: none. Design, Product UI/UX package and independent reviews: N/A — not applicable at this stage.

## Problem And Desired Outcome
Daily Assistant using Antigravity reports successful open_tab while embedded Browser stays undisplayed. Restore the existing documented outcome: successful local browser session opening is reflected in the embedded Browser UI, not just a green Activity entry.

## Relevant Current, Desired And Preserved Behavior
| ID | Scenario | Current evidence | Desired | Preserve |
| --- | --- | --- | --- | --- |
| BEH-001 | SCN-001 | AGY wraps result under output; UI cannot see tab ID, skips focus | Eligible local success shows returned session and selects Browser | Tool/session identity and successful operation result |
| BEH-002 | SCN-002 | Canonical browser results recognized | Keep working | Other supported runtime browser behavior |
| BEH-003 | SCN-003 | Local projection suppressed for remote/unavailable shell | No change | Node isolation and existing shell lease rules |
| BEH-004 | SCN-004 | Unrelated AGY results carry provider metadata | No change | Non-browser/native/third-party tools and error semantics |
Evidence: investigation-notes.md F-001–F-003, docs/browser_sessions.md and diagnostic results.

## Actors
User wants to see/use the page opened by their local assistant. Agent requires accurate tab handles/results. Remote node users must not unexpectedly control the local shell.

## Scope Guardrail
### In-scope use cases
- UC-001: local AGY Daily Assistant opens a browser page (SCN-001).
- UC-002: preserve existing canonical browser presentation (SCN-002).
- UC-003: preserve remote/unavailable-shell suppression (SCN-003).
- UC-004: preserve unrelated AGY tool behavior (SCN-004).
### Out of scope / non-goals
No browser subsystem rewrite, UI redesign, provider/model changes, automatic retry/focus policies, data migrations, historical result rewriting, remote-local browser pairing, site CAPTCHA/authentication fixes, or generalized browser reliability hardening. No claim to solve every previously observed failure. F-002 is a separate candidate, not mandatory corrective scope.
### Preserved boundary
BEH-002–004; existing session/cookie/history data must remain intact; no session stealing between windows.
### Review authority
Blocking implementation/design findings must cite approved requirements/AC/preserved behavior. New product policy is a Requirement Gap requiring user approval; reviewers cannot expand scope by themselves.

## Requirements And Acceptance Criteria
| Requirement | Intended behavior | Acceptance criterion / verification | Traceability |
| --- | --- | --- | --- |
| REQ-001 | Successful configured AGY open_tab in an eligible embedded window shows the returned session and selects Browser without manual repetition | AC-001: local about:blank/harmless test page open produces matching tab_id in Browser, Browser selected, page visible. Exercise provider conversion through actual UI; diagnose exact incident shape as regression. | UC-001 / BEH-001 / SCN-001 |
| REQ-002 | Keep canonical browser successes working and remote/unavailable local projection suppressed | AC-002: canonical object/string cases focus correctly; remote/unavailable cases do not call local focus or select Browser; preserve shell ownership restrictions. | UC-002–003 / BEH-002–003 / SCN-002–003 |
| REQ-003 | Preserve unrelated AGY tools, failed/denied states and current user data | AC-003: regression assertions for native and third-party/non-browser MCP tools and failure cases; no unrelated payload rewriting or false successful focus; existing cookies, sessions/history are not reset/replaced by correction. | UC-004 / BEH-004 / SCN-004 |

## Relevant Scenarios And Journeys
- SCN-001 — Supported Normal Scenario: embedded node/window and configured Daily Assistant/browser available; user asks assistant to open harmless URL; AGY invokes open_tab; successful returned local session is displayed in Browser. On tool failure do not manufacture a success. Evidence: user incident and existing Browser Runtime Flow documentation.
- SCN-002 — Supported Normal Scenario: another supported runtime returns canonical open_tab success; existing focus/display outcome unchanged. Evidence: Codex/Claude contract and renderer controls.
- SCN-003 — Supported Explicit Edge Scenario: remote-bound window or missing local shell gets tool success; no local-browser focus. Evidence: explicit runtime/node isolation contract and renderer tests.
- SCN-004 — Supported Normal Scenario: AGY executes unrelated native/MCP tools, including failed calls; existing presentation/output semantics retained. Evidence: AGY converter and MCP transport suite.
These behaviors are approved under AP-001. Synthetic fixture calls are verification methods, not new product scope.

## UI / Quality / Data Continuity
Use existing Browser panel, internal tabs and Activity; no new visual design. Prototype/UI/UX supplement N/A. QR-001 (REQ-001/AC-001): each eligible completed open in deterministic regression must display the matching session, not merely assert backend success. No invented latency target. Native/browser data and run history preserved (REQ-003/AC-003); no reset or rewrite authorized.

## Contracts, Supplements And Decisions
Existing browser runtime/session contract, investigation-notes.md and its evidence inventory are supporting evidence; no behavior-defining supplements. DEC-001: approve narrow REQ-001–003 correction? Resolved: approved by user AP-001. Technical design now proceeds; independent validation and delivery gates remain required.

## Architecture Phase Input
Map SCN-001–004 to runtime conversion, event streaming and shell presentation while preserving browser ownership boundaries. Verify actual AGY successful browser payload variants and scope any normalization to the authoritative browser contract. Existing normalizer cannot simply unwrap the current AGY result wrapper. Final live validation must use an isolated desktop instance, not user's running app.

## Readiness
Current behavior evidence-backed: yes. Desired/preserved behavior explicit: yes. Scope and non-goals clear: yes. Testable traceability/scenarios: yes. UI/prototype supplements: N/A. Risks/unknowns visible: yes. Content ready for approval: yes. User approval / approved basis ready for design: yes; AP-001 resolves DEC-001. Behavior-defining supplements: none.

## SR-002 evidence update
The real isolated desktop path now reproduces SCN-001 with actual AGY and native Electron. See investigation-notes.md and evidence/desktop/desktop-reproduction.md. Intended behavior/REQ/AC unchanged; approval remains pending.

## SR-004 evidence update
Current-state connection audit and fault injection added; REQ-001–003 baseline unchanged. Stronger presentation-error/recovery policy remains a non-authoritative follow-up decision, not approved scope.

## SR-005 approval capture
AP-001 explicitly approves the demonstrated narrow correction, not a global session-discovery, retry, error-feedback or browser-ownership redesign. Prior SR-002/SR-004 pending-approval statements above are historical evidence status. The canonical current state is Approved.
