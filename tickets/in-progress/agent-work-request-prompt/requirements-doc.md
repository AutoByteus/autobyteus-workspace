# Requirements — Agent Work Request Prompt

Package: agent-work-request-prompt. Baseline R1 / SR-001. Status: Approved.
Approval: user explicitly approved the discussed concise platform-wide rule and update: “i agree. lets do the update. i think its simple. lets go”. This approves the preceding wording, shared coverage and tool-language alignment, not unrelated routing/schema changes.

## Goal and scope
Incoming work must activate the recipient's own instructions and applicable skills rather than acknowledgement-only conversation. Apply across Team/Org members, collaborator teams, standalone collaborators and delegated workers through existing prompt paths. Keep the change to concise platform wording, associated tests and documentation.

## Supported scenarios, behaviors, requirements and acceptance criteria
| Scenario / use case | Classification and trigger | Behavior / requirement | Acceptance |
| --- | --- | --- | --- |
| SC-001 / UC-001 | Supported Normal Scenario: agent sends assigned work through configured Team/Org handoff | BE-001 / REQ-001: recipient works under own instructions/skills; no acknowledgement or promise instead of work | AC-001: team composition contains the approved rule once, before messaging mechanics |
| SC-002 / UC-002 | Supported Normal Scenario: user requests an ad-hoc collaborator and host sends it work | BE-002 / REQ-002: same execution obligation without requiring configured return rules | AC-002: standalone and collaborator-team paths carry same canonical rule; no matching rule means result/blocker goes to requesting agent via send_message_to |
| SC-003 / UC-003 | Supported Explicit Edge Scenario: skill reaches an intermediate handoff or cannot proceed | BE-003 / REQ-003: preserve skill-defined handoff/approval boundaries and allow specific blockers | AC-003: wording says “when your instructions or skill call for a handoff, or when you are blocked”, not only final completion |
| SC-004 / UC-004 | Supported Normal Scenario: agent sends results or receives informational notification | BE-004 / REQ-004: messaging language describes work/results, not casual acknowledgement | AC-004: tool description and section heading align; no unconditional acknowledgement loop or command to treat every notification as new work |

## Approved wording basis
On receiving a work request, follow your own agent instructions and applicable skills. Do not send acknowledgements or promises to work. Use `send_message_to` when your instructions or skill call for a handoff, or when you are blocked. Follow applicable handoff rules; otherwise, return the result or specific blocker to the requesting agent.

## Preserved behavior / non-goals
Preserve actual addressing, existing-instance versus new-copy semantics, team-local routing, optional tool exposure, notification handling, approval gates and delivery confirmation. No new transport/API/schema, no runtime message gate, no edits to individual agents/skills, no resolution of the separately observed every-match versus single-rule skill inconsistency. Do not rewrite saved prompts/history or force running sessions to refresh. No guarantee that prompt text alone eliminates all model errors.

## Constraints and verification
Concise, precise language. Reuse one wording owner rather than copy/paste. Verify compositions and tool descriptions with focused tests and inspect resulting text. Runtime adherence remains a model-behavior risk; no specific failed Product trace was supplied.

## Readiness and review authority
Ready for design: Yes; explicit approval above. UI/prototype: N/A — prompt-only change. Data continuity: saved runs, definitions and history preserved; no data loss authorized. Open intended-behavior decisions: none. Current behavior is recorded in investigation E1-E6; traceability is the scenario table. Review may require corrections against REQ-001–004/AC-001–004, not expand scope without renewed approval.
