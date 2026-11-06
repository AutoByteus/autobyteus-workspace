# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `backend-port-taken-by-agent-dev-server`
- Request / ticket: Project Task `autobyteus-restart-reliability-3` (Project `project_0b3edda8-91b4-4c0c-8a11-afed3bea2a05`)
- Requested by: `/project_task_manager` (run id `project_task_manager_b9bdef7e859e4da781c68d8fa4a79061`), on behalf of the user's report of 2026-11-06
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: Solution Designer conversation message of 2026-11-06 announcing the decisions below (SR-001)
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: None (bug report and evidence are evidence, not behavior-defining)

## Problem And Desired Outcome

- Problem: The desktop launcher puts `PORT=29695` and `SERVER_PORT=29695` (the backend's own port) into the backend's environment. Nothing reads them, but every agent runtime and tool shell inherits them, so programs an agent starts (Nuxt/Vite dev servers and anything else honouring `PORT`/`SERVER_PORT`) try to bind 29695. On macOS such a program can take `[::]:29695` even while the backend is running; it often outlives the agent session, and every later backend start / Restart Server fails with "Backend port 29695 is already in use" until the user finds and kills it.
- Affected actors or systems: desktop users running agents that start dev servers; the embedded backend lifecycle.
- Desired outcome: AutoByteus no longer steers agent-started programs onto its backend port; startup and Restart Server succeed once no foreign holder exists; the error screen no longer claims the server is "starting up" while it is stopped, and stops polling forever.
- Observable definition of success: in a desktop-launched backend, a command run by an agent (native terminal tool or an external runtime) sees neither `PORT` nor `SERVER_PORT` set by AutoByteus; a Nuxt dev server started that way picks its own HMR port (24678+); with an incident-shaped holder on the port, start/Restart report the conflict and succeed after the holder exits.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Launcher injects `PORT`/`SERVER_PORT` = backend port into the backend env | Launcher does not inject them | Backend port (29695 production), `--port` argument, bind address `0.0.0.0`, `AUTOBYTEUS_SERVER_HOST`, `AUTOBYTEUS_DATA_DIR`, `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE`, `DATABASE_URL`, `DB_TYPE`, overrides, env policies | E1–E3 |
| BEH-002 | User | SCN-002 | Agent-started programs inherit `PORT=29695`/`SERVER_PORT=29695` and try the backend port | Agent-started programs see no AutoByteus-injected `PORT`/`SERVER_PORT`; they use their own defaults | The rest of the inherited environment (PATH, credentials policy, AutoByteus markers, a caller's own variables) | E6, E7, P1 |
| BEH-004 | System | SCN-003 | Holder on `[::]:29695` → `PortConflictError` after 5 s; Restart repeats it | Unchanged detection; covered by regression with the incident's holder shape | No-kill policy; advisory owner identity; fixed port | E9, P2 |
| BEH-005 | System | SCN-003 | After the holder exits, Restart Server starts the backend | Same, covered by regression for the incident shape | — | E9 |
| BEH-006 | User | SCN-004 | In ERROR, health shows "Server is starting up..."; renderer polls health every 2 s forever | In ERROR, health says the server is not running; no periodic health polling while in ERROR; polling/health resume normally after Restart Server | Health behavior in STARTING/RESTARTING/RUNNING; manual "Check Server Health" button keeps working | E10, A4, A5 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop user | Use the app while agents run dev servers | Backend port not taken by agent-started programs; truthful error screen | No data reset, no kill of their processes by the app |
| Agent runtimes / tool shells | Run user programs | Clean environment without AutoByteus's listen port | Keep everything else they receive today |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Desktop app launches its embedded backend (initial start, Restart Server, after update) | SCN-001, SCN-003 |
| UC-002 | An agent (any runtime, or the native terminal tools) starts a program that reads `PORT`/`SERVER_PORT` | SCN-002 |
| UC-003 | User sees the server error screen and its health information | SCN-004 |

### Out Of Scope

- Stopping/killing a port holder from the app, or detecting AutoByteus markers on it (candidate 3) — follow-up FU-002.
- Holding the port across restart/update (candidate 2) — measured ineffective on macOS; not taken (DEC-004).
- Changing the fixed-port policy or adding a fallback port (candidate 4, prior DEC-003) — not taken (DEC-005).
- Changing the backend's bind address (e.g. dual-stack `::`) — follow-up FU-001.
- Stripping variables from a caller's own environment (`inherit-caller` policy) or per-runtime environment filtering.
- Lifetime of agent-started background processes (busy-quit-shutdown-orphan FU-003).
- Release or installed build.

### Non-Goals

- Guaranteeing no other program ever uses port 29695.
- Cleaning up processes already started by older builds that still carry `PORT=29695`.

### Preserved Behavior Boundary

- BEH-001 preserved column; BEH-004 no-kill, advisory identity and fixed port; AC-005.
- The `isolated-baseline` (e2e) environment policy keeps its baseline-only rule.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The desktop app must not place its backend's listen port into the backend's environment under the generic names `PORT` or `SERVER_PORT`, in any environment policy, so that no agent runtime, tool shell or their descendants inherit it from AutoByteus | BEH-001, BEH-002 | Must | Root cause | P1 (`PORT` unset → Nuxt HMR uses 24678); E3 (no reader) | Task direction 1; DEC-001 |
| REQ-002 | The backend must keep listening on the same port and address as today, with all other launch variables unchanged | BEH-001 | Must | No regression in renderer, phone pairing, stored node URLs | E2 (port comes from `--port`) | Preserved behavior |
| REQ-003 | Startup and Restart Server must keep reporting a port conflict (with the advisory owner identity, without terminating it) while a foreign process holds the backend port, including an IPv6-wildcard holder as in the incident, and must start the backend once the holder is gone | BEH-004, BEH-005 | Must | Recovery path; regression coverage required by the Task | P2-B (preflight detects `[::]` holder) | Task "Done when" |
| REQ-004 | While the server is in ERROR, the health information must say the server is not running (not "starting up"), and the app must not poll health periodically; after Restart Server the normal status/health flow resumes | BEH-006 | Should | Same incident S1/S2; cheap | N/A | Task direction (lower priority, if cheap); DEC-006 |
| REQ-005 | The packaged-build server startup verification must mirror the production launch environment | BEH-001 | Should | Keep the build check faithful to REQ-001 | N/A | DEC-001 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | Compose the backend env for `inherit-caller` and `isolated-baseline`, caller env without `PORT`/`SERVER_PORT` | The composed env has neither `PORT` nor `SERVER_PORT` | — | Unit test (fails on base) |
| AC-002 | REQ-001 | BEH-002, SCN-002 | Backend launched with the desktop-composed env; an agent's native terminal command prints `PORT`/`SERVER_PORT` | Both are unset in the command's environment | — | Executable check against a real backend process |
| AC-003 | REQ-001 | BEH-002, SCN-002 | Under the AC-002 environment (backend env as composed), a get-port-please `getPort({portRange:[24678,24698]})` call (Nuxt's HMR call) | Chooses 24678–24698, not the backend port | — | Executable probe (P1 shape) |
| AC-004 | REQ-002 | BEH-001, SCN-001 | Normal desktop-style start of the backend | Backend listens on the configured port at `0.0.0.0`; `AUTOBYTEUS_SERVER_HOST` and the other variables are as before | — | Unit composition test + isolated start |
| AC-005 | REQ-003 | BEH-004, BEH-005, SCN-003 | A listener on `[::]:<port>` (default-host listen, the incident's shape) holds the backend port; start / Restart Server | `PortConflictError` / ERROR with the conflict diagnostic; the holder is still listening afterwards; after the holder closes, a new start/Restart succeeds | Where IPv6 is unavailable the `[::]` case is skipped with a stated reason; the existing `127.0.0.1` case still runs | Real-socket test |
| AC-006 | REQ-004 | BEH-006, SCN-004 | Server in ERROR; user opens technical details / presses Check Server Health | Text says the server is not running (no "starting up") | — | Unit/component test |
| AC-007 | REQ-004 | BEH-006, SCN-004 | Server enters ERROR at initial startup | No further periodic health calls while in ERROR; after Restart Server reaches RUNNING the status shows RUNNING as today | — | Store test with fake timers |
| AC-008 | REQ-005 | BEH-001 | Packaged server startup verification script | Launches without `PORT`/`SERVER_PORT` and still passes its health check | — | Inspect + run where the build check runs |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal Or Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Desktop app | Start embedded backend | App launch, Restart Server, post-update launch | App installed | Compose env → spawn `app.js --port` | Backend on its port; env without `PORT`/`SERVER_PORT` | Conflict → SCN-003 | Supported Normal Scenario | E1, E2 | REQ-001/002/005, AC-001/004/008 |
| SCN-002 | User | User via agent | Agent runs a dev server (`npm run dev`) or similar | Agent tool/shell command | Backend running | Runtime spawns shell → program reads `PORT` | Program uses its own default port | — | Supported Normal Scenario (incident 2026-11-05/06, 2026-10-24) | snapshot, P1 | REQ-001, AC-002/003 |
| SCN-003 | System | Desktop app | Recover from a port conflict | Start / Restart Server with a foreign holder | Foreign `[::]` holder on the port | Preflight → conflict diagnostic → user stops holder → Restart | Backend starts | Holder never exits → stays ERROR with guidance | Supported Normal Scenario | E9, P2 | REQ-003, AC-005 |
| SCN-004 | User | User | Understand a stopped server | Error screen / Check Server Health | Server in ERROR | Read technical details | Truthful "not running" text; no endless polling | — | Supported Normal Scenario | E10, app.log | REQ-004, AC-006/007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (text only, REQ-004)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Product ticket / design repository / user-confirmation / visual references: N/A — not applicable
- Required states: ERROR state shows a "not running" health text instead of "starting up". Exact wording is an implementation detail in the existing English health-text style (the store's existing health strings are not localized).
- Product decisions that need the user: None.

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, AC-004 | Compatibility | No change to port, bind address, renderer endpoint or stored node URLs | All platforms | Composition test; isolated start |
| QR-002 | REQ-003, AC-005 | Reliability | Validation never signals processes it does not own; holders in tests are test-owned | All validation | Test design review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| get-port-please / Nuxt vite-builder | Uses `process.env.PORT` first when set | E7, P1 | Low |
| `AUTOBYTEUS_SERVER_HOST` | Remains the supported way for agents/tools to reach the backend | E1 | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `bug-report.md`, `evidence/*` | Incident evidence | All | Final | Evidence only |
| `follow-ups.md` | Candidates not taken | FU-001, FU-002 | Active | Not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | No external (out-of-repo) consumer relies on the backend env's `PORT`/`SERVER_PORT` | Removing them must not break agents | No reader in repo (E3); supported contract is `AUTOBYTEUS_SERVER_HOST` | Accepted |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where to stop the leak? | Fix the cause once, for all runtimes | (a) strip at each of ~15 spawn sites; (b) server deletes `PORT` after reading it; (c) launcher stops injecting | The server reads its port only from `--port` (E2) and nothing reads `PORT`/`SERVER_PORT` (E3); Electron is the only launcher that exports them (E4). (c) removes the cause at its single owner and covers every present and future child; (a) is fragile, (b) is moot. Choose (c), and keep the build verification mirror aligned | Solution Designer | Decided |
| DEC-002 | Strip a `PORT` the user's own caller environment provides? | Scope of env filtering | Packaged launches have no `PORT`; a caller `PORT` is the user's, not the backend port | Not AutoByteus's port, so not the root cause; filtering user env changes `inherit-caller`'s contract. Leave unchanged | Solution Designer | Decided |
| DEC-003 | Also strip `HOST`? | Bug report suggested "probably HOST" | AutoByteus never sets `HOST` (E1) | Nothing to remove; no change | Solution Designer | Decided |
| DEC-004 | Take candidate 2 (keep port during restart/update)? | Narrow the window | P2: on macOS a default-host listen succeeds while the backend holds `0.0.0.0` — there is no window to narrow | Not taken; the related, effective hardening (dual-stack bind) is FU-001 | Solution Designer | Decided |
| DEC-005 | Take candidate 3 (actionable conflict screen with "stop agent-started process") or candidate 4 (fixed port)? | Optional per direction | 3 gives the app kill authority over processes it does not manage (reverses prior DEC-002), needs per-platform env inspection; after the root fix it only addresses transitional/foreign holders. 4 is not needed to fix the cause | Not taken; 3 recorded as FU-002 with reasons; 4 not raised (direction: only if necessary) | Solution Designer | Decided |
| DEC-006 | Fix S1/S2 now? | Same incident; "if cheap" | Both local to status manager + store; coupled (A5) | Cheap and coupled; take both | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-002, AC-003 | SCN-001, SCN-002 | E1–E7, P1 |
| REQ-002 | UC-001 | BEH-001 | AC-004 | SCN-001 | E2, E8 |
| REQ-003 | UC-001 | BEH-004, BEH-005 | AC-005 | SCN-003 | E9, P2 |
| REQ-004 | UC-003 | BEH-006 | AC-006, AC-007 | SCN-004 | E10, A4, A5 |
| REQ-005 | UC-001 | BEH-001 | AC-008 | SCN-001 | E5 |

## Architecture Phase Input

- Approved scenarios: SCN-001..SCN-004.
- Constraints: QR-001; no-kill policy; `isolated-baseline` rule.
- Deferred to design: exact health result shape for ERROR; where the renderer poller stops.
- Technical facts to verify: platform managers all use `buildServerProcessEnv` (A1).
- Risks: R-001, R-003.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
