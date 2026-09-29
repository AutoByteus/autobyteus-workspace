# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (approved SR-002 basis; SR-003 adds design)
- Package identifier: `isolated-app-parallel-control-ports`
- Request / ticket: Parallel E2E engineers collide on the fixed isolated-app control port
- Requirements owner: Solution Designer (`/solution_designer`)
- Date: 2026-09-29
- Approval state and reference: Approved by the user in conversation on 2026-09-29 ("if yes, lets do it"). This followed the recommendation not to add `--port` to the browser CLI. It covers REQ-001..004, AC-001..005, DEC-001 (any free port, kept on restart) and DEC-003 (one-line wording fix in the browser-automation SKILL.md).
- Exact approved requirements baseline / solution revision: SR-002
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: `pnpm isolated-app start` uses control port 9333 unless `--control-port` is given. When several E2E engineers in different worktrees start instances, the second one fails or has to pick a port by hand. The docs hardcode `9333` in every browser-automation example, so an engineer can end up driving another engineer's app.
- Desired outcome: Every engineer runs `start` without thinking about ports, gets their own free control port, and drives their own instance with the port that `start` reported.
- Observable definition of success: Three engineers in three worktrees start instances at the same time. Each gets a different control port, and each browser-automation session sees only its own window.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001, SCN-002 | Default control port is always 9333. A busy port fails `CONTROL_PORT_IN_USE`. | With no `--control-port`, a free port is picked automatically, the same way the server port already is | Loopback-only control endpoint | `instanceLifecycle.mjs:32,263,280` |
| BEH-002 | Operational | SCN-003 | `--control-port <n>` uses `<n>` or fails | Unchanged | Explicit port is never silently replaced | `cli.mjs:67-69` |
| BEH-003 | Operational | SCN-001 | Result reports `instanceId`, `controlPort`, `controlEndpoint` | Unchanged. Engineers use these values. | Output schema v1 | `instanceLifecycle.mjs:65-82` |
| BEH-006 | Operational | SCN-001 | Docs and skill hardcode `CHROME_REMOTE_DEBUGGING_PORT=9333` and allow id-less `stop`/`restart` | Docs and skill say: use the reported `controlPort`, and pass your own `instanceId` to `stop`/`restart` | Attach-only pattern | Skill and guide |
| BEH-007 | Operational | SCN-004 | `restart` keeps ports, data root and id | Unchanged | Same port after restart | `instanceLifecycle.mjs:365-389` |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Start without choosing a port, then control the instance through browser-automation using the reported port.
- UC-002: Several engineers start instances at the same time from different worktrees.
- UC-003: Request a specific port explicitly.
- UC-004: Restart and keep the same port.

### Out Of Scope

- Worktree ownership and scoping in the instance registry. The docs rule "always pass your `instanceId`" covers this instead.
- Readiness identity proof. It is not needed once ports are OS-assigned random free ports rather than a shared fixed default (see investigation notes, SR-002).
- Browser-automation code (`autobyteus_mcps`). It already works per port.
- Browser-automation's own default Chrome on 9222 for plain web testing.
- `test:e2e:electron` harnesses.

### Non-Goals

- A port-reservation service, stable per-worktree ports, or changes to the production app.

### Preserved Behavior Boundary

BEH-002, BEH-003, BEH-007. Also preserved: the CLI JSON envelope, exit codes, data-root rules, and the rule never to touch the main app.

### Review Authority

- Blocking findings must cite a REQ/AC/BEH ID. New behavior beyond this boundary is a `Requirement Gap` that needs user approval. Adjacent concerns are non-blocking recommendations.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | When `--control-port` is not given, `start` uses a free control port picked automatically and reports it as `controlPort` / `controlEndpoint` | BEH-001, BEH-003 | Must | User request |
| REQ-002 | `--control-port <n>` is honored exactly or fails with `CONTROL_PORT_IN_USE` | BEH-002 | Must | Preserved |
| REQ-003 | `restart` keeps the instance's control port | BEH-007 | Must | Preserved |
| REQ-004 | The isolated-app skill, guide, packaging doc and README tell engineers to pass the reported `controlPort` to browser-automation and their own `instanceId` to `stop`/`restart`. They show no fixed port to copy, and they mention parallel use across worktrees. | BEH-006 | Must | User request |

## Acceptance Criteria

| AC ID | REQ | Trigger | Expected Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | `start` with no port while 9333 is occupied | Succeeds on another free port. Browser-automation `list-tabs` on the reported port shows this instance's window. | Unit + real packaged run |
| AC-002 | REQ-001 | Three `start`s at the same time | Three distinct control ports. Each endpoint shows its own instance's window. | Real packaged run |
| AC-003 | REQ-002 | `--control-port 9444` free / busy | Uses 9444 / `CONTROL_PORT_IN_USE` with nothing launched | Unit |
| AC-004 | REQ-003 | `restart` | Same `controlPort` afterwards | Unit |
| AC-005 | REQ-004 | Read the docs | Examples use the reported `controlPort` and `instanceId`. No hardcoded 9333. | Doc review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Steps | Expected Outcome | Validity | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | E2E engineer | `start` → read `instanceId` + `controlPort` → browser-automation attach on that port → `stop <instanceId>` | Own app controlled | Supported Normal Scenario | REQ-001,004 / AC-001,005 |
| SCN-002 | Operational | 3 engineers in 3 worktrees | Parallel SCN-001 | No interference | Supported Normal Scenario (user statement; live registry evidence) | REQ-001 / AC-002 |
| SCN-003 | Operational | Engineer | `start --control-port <n>` | Exact port or error | Supported Normal Scenario | REQ-002 / AC-003 |
| SCN-004 | Operational | Engineer | `restart <instanceId>` | Same port, new tab id | Supported Normal Scenario | REQ-003 / AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | REQ | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-001 | Security | The control port stays loopback-only | Probe |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`

## External Contracts And Dependencies

| Contract | Required Behavior | Risk |
| --- | --- | --- |
| Browser-automation | Port per call via `CHROME_REMOTE_DEBUGGING_PORT` | None |
| Browser-automation SKILL.md (`autobyteus_mcps`) | One line says "control port 9333" | DEC-003: fix the wording in the same delivery (recommended, one line) |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-003 | OS-assigned free ports make a collision between concurrent starts negligible. The existing busy check still fails cleanly in the rare case. | Proposed |

## Open Decisions And Questions

| ID | Question | Recommendation | Status |
| --- | --- | --- | --- |
| DEC-001 | How to choose the default port | Any free port, kept on restart | Approved |
| DEC-003 | Also fix the one-line wording in browser-automation SKILL.md | Yes | Approved |
| DEC-004 | Add `--port` to the browser CLI? | No. The env variable already works; possible follow-up only if agents misuse it in practice. | Decided (user accepted recommendation) |

DEC-002 (cross-worktree explicit-id policy) is withdrawn with registry scoping (SR-002).

## Traceability

| REQ | Use Cases | Behavior | AC | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-003 | AC-001, AC-002 | SCN-001, SCN-002 |
| REQ-002 | UC-003 | BEH-002 | AC-003 | SCN-003 |
| REQ-003 | UC-004 | BEH-007 | AC-004 | SCN-004 |
| REQ-004 | UC-001 | BEH-006 | AC-005 | SCN-001 |

## Architecture Phase Input

- Constraints: Reuse the existing free-port helper (`selectListenerPort`) and keep `launchPorts.mjs` semantics.
- Expected shape: A small change in `instanceLifecycle.mjs` and the CLI help, plus doc edits.

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: `Yes`. Desired/preserved explicit: `Yes`. Scope clear: `Yes`. ACs testable: `Yes`. Scenarios covered: `Yes`. Prototype: `N/A`. UI/UX: `N/A`. Assumptions visible: `Yes`.
- Content ready for user approval: `Yes`

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-09-29, conversation)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
