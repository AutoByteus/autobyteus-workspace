# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-010`
- Package identifier: `agent-isolated-app-recording`
- Request / ticket: Agent-driven isolated AutoByteus instances — launch, control, screenshot and record tutorial videos; root-level documentation
- Requirements owner: Solution Designer
- Date: 2026-09-28
- Approval state and reference: Approved — current basis SR-009 (user approvals 2026-09-29 quoted in the next line). History: SR-003 baseline approved 2026-09-28 ("yeah, I think I'll approve now"; DEC-001..DEC-005 as recommended); SR-006 REQ-015/DEC-002 per user direction; SR-009 superseded SR-003's recording placement (recording now in the browser MCP) and withdrew REQ-012. SR-010 repaired corrupted AC/scenario rows without changing approved intent.
- Exact approved requirements baseline / solution revision: SR-009 — SR-006 basis + user approvals 2026-09-29: built-in MCP helper and dead-process stop ("that's fine … it belongs to where they are"), recording moved to the browser MCP without breaking existing behavior ("yes. move record to browser mcp … it should not break how it works"), package import dropped ("drop import package … belongs to functionality of the application") (SR-003 baseline + REQ-015/AC-014/DEC-002 per user direction 2026-09-28: "the agent decides by itself to run the command"; "in the past the agent has run them … they run it")
- Behavior-defining supplements and their approved versions: None (evidence images are non-normative)

## Problem And Desired Outcome

- Problem: Tutorial videos of AutoByteus are recorded by hand. Technically, an agent inside AutoByteus can already start a second, isolated AutoByteus and drive it, but only by undocumented tricks. When started from an agent shell it fails (inherited `ELECTRON_RUN_AS_NODE=1`), and once started it silently shares the user's production memory folder and agent/skill roots (inherited environment). The browser tool has no first-class click/type actions, no visible cursor and no video recording. There is no agent-oriented documentation.
- Affected actors or systems: agents running inside AutoByteus; developers; the user's production AutoByteus data; `autobyteus-mcps` browser-automation.
- Desired outcome: An agent can, with a few documented commands, start a fully isolated AutoByteus (installed or freshly built), import agent packages into it, drive it like a human with a visible cursor, take screenshots, record MP4 video of the session, and stop it cleanly, without any risk to the main app or the user's data. A root-level guide documents the whole workflow for agents and humans.
- Observable definition of success: A fresh AutoByteus agent given only the skill/guide produces a short recorded tutorial clip (MP4 with visible cursor) of an isolated instance, while the main app keeps running and production data is untouched.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001, SCN-002 | `e2e` profile gives own port/data root/updater-off; only usable via env variables or the test harness. | Agents start/stop isolated instances through one agent-oriented lifecycle command with JSON output. | `production`/`e2e` profile contract, data-root safety checks, port rules, test harness behavior. | P-2, launch-profile code |
| BEH-002 | Operational | SCN-001 | Launch from an agent shell fails (inherited `ELECTRON_RUN_AS_NODE=1`). | Launch works from an agent shell with no manual environment cleanup. | Embedded server still runs with `ELECTRON_RUN_AS_NODE=1` internally. | P-1 |
| BEH-003 | Operational | SCN-001, SCN-005 | Isolated server inherits production memory dir, DB name, package/skill roots, catalog settings from the caller. | An isolated instance never reads or writes the user's production data and never picks up production package/skill roots or settings, however it is launched. | Production instance configuration unchanged. | P-3 |
| BEH-004 | User | SCN-003 | "Update failed" toast appears in isolated instances. | No update checks and no update UI/errors in isolated instances. | Production update behavior unchanged. | P-2 |
| BEH-005 | Operational | SCN-003 | Control only via env-configured port and hand-written `run-script`; if nothing listens, the tool silently launches its own Chrome. | The isolated instance is started on a fixed, known control port that the user configures in the agent's browser MCP once; the MCP attaches only and reports an error if nothing is listening. Agents act through the existing `run_script`, which has a built-in presentation helper (`__abDemo`: click/type/key/hover/scroll/select/wait) that the MCP installs automatically when a script uses it. | Existing tools, tab-id model and JSON contract unchanged; no new action tools. | P-4, P-5 |
| BEH-006 | Operational | SCN-003, SCN-004 | No visible cursor; no recording. | The browser MCP's built-in presentation helper provides a visible animated cursor, click indicator, paced typing and captions; the browser MCP gains exactly two tools, `start_recording` and `stop_recording`, recording a tab to MP4 through a background recorder while every other call keeps its connect–operate–disconnect behavior. | Existing browser MCP tools and their behavior unchanged. | P-5, P-6 |
| BEH-007 | Operational | SCN-003 | `run-script` silently ignores `async (arg) => …`. | Async arrow functions execute. | Other script forms unchanged. | P-5 |
| BEH-008 | Operational | SCN-002 | Building and launching a worktree build is a test-harness path. | One documented path from a source worktree to a running isolated instance of that build. | Existing build scripts. | package.json |
| BEH-009 | Operational | SCN-006 | No agent-oriented documentation; README section is test-oriented. | Root-level guide + agent skill cover the complete workflow. | Existing README/packaging docs remain valid (linked, not duplicated). | README |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Recording agent (inside AutoByteus) | Produce tutorial screenshots/videos | Simple commands, JSON results, visible cursor, MP4 output | Runs in a shell inheriting the main app environment |
| Developer / implementation agent | Validate source changes in a real desktop app | Build + launch isolated instance, control, screenshot | Main app keeps running |
| User | Stop recording tutorials manually; keep data safe | Reliable, documented workflow | Production data must never be touched |
| Future maintainers | Understand and extend the workflow | Root-level guide | Single source of truth, linked to technical docs |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Start an isolated AutoByteus instance from the installed app (or a given app path) with its own port, data root and control endpoint; list/stop it.
- UC-002: Build the current source worktree and start an isolated instance of that build.
- UC-003: Control an isolated instance from the browser MCP configured to its fixed control port: observe, act through `run_script` and its built-in presentation helper, screenshot.
- UC-004: Record video of a tab (the isolated instance window or any browser page) through the browser MCP, optionally with a visible cursor and captions.
- UC-006: Read the root guide / use the agent skills to perform UC-001..UC-004 and UC-007.
- UC-007: Guarantee isolation of production data regardless of launch environment.

### Out Of Scope

- A new launch profile name (the existing `e2e` profile is the isolation mechanism).
- Windows hosts (see DEC-004).
- Narration/editing tooling changes (existing `tts-mcp` and `video-audio-mcp` are used as-is; see DEC-001).
- Controlling native OS surfaces (file dialogs, system menus, notifications) through the browser tool; OS-level control (`computer-use-mcp`) is not changed.
- Automatic creation of demo data (the recording agent does it).
- Automating OS permission grants.
- Publishing videos anywhere.

### Non-Goals

- Replacing the packaged E2E test harness.
- Any new browser MCP tool other than `start_recording` and `stop_recording` (DEC-006); changing the connect–operate–disconnect behavior of existing tools; per-call target/endpoint selection (DEC-007).
- Importing agent packages through the lifecycle command (REQ-012 withdrawn, SR-009): package import is application functionality, done through the instance's own UI (possible future tutorial).
- Remote (non-loopback) control of instances.

### Preserved Behavior Boundary

- BEH-001..BEH-008 "Intentionally Preserved" column; production launch (no env variables) is byte-for-byte the same behavior; existing browser-automation commands, JSON schema v1 and exit codes remain compatible.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A single agent-usable command starts an isolated instance from the installed AutoByteus app by default or from an explicitly given app/executable, waits until it is ready, and returns machine-readable details: instance id, backend URL, control (debugging) endpoint, data root, process id and log location. The control port is a fixed documented default (overridable) so it matches a browser MCP configured once by the user; if that port is busy, start fails with a clear error. Backend port and data root are chosen automatically unless given. | BEH-001 | Must | "Very easy for agents" | User; P-2 |
| REQ-002 | An isolated instance never reads or writes the user's production AutoByteus data and does not inherit production-specific server settings (memory, database, agent-package roots, skill roots, featured catalog, etc.) from the launching environment — regardless of whether it is launched by the new command, the existing test harness, or manually with the documented variables. | BEH-003 | Must | Data safety | P-3 |
| REQ-003 | Starting an isolated instance works from an agent shell inside AutoByteus without manual environment cleanup. | BEH-002 | Must | Agents inherit `ELECTRON_RUN_AS_NODE=1` | P-1 |
| REQ-004 | Agents can list running isolated instances, and stop one: the whole process tree ends, its ports are released, and the main app is never affected. Several isolated instances can run concurrently. Data-root retention follows DEC-003. | BEH-001 | Must | Lifecycle | P-7 |
| REQ-005 | The browser MCP, configured by the user with the instance's fixed control port, can be set to attach-only: it controls the isolated instance through its existing tools, and when nothing is listening on that port it reports an error and never launches a browser of its own. Attach-only is a configuration setting, not a tool. | BEH-005 | Must | Avoid silently controlling the wrong app | P-4; browser-automation config; DEC-007 |
| REQ-006 | Without adding MCP tools, agents can click, type/fill text, press a key/shortcut, hover, scroll, select an option and wait for an element or text — targeting by CSS selector or visible text — by calling the presentation helper (`__abDemo`) in short expressions through the existing `run_script`. The helper is a built-in capability of the browser MCP: whenever a script uses it and the page does not have it (first use, after navigation or reload), the MCP installs it before running the script, with no separate loading step; pages whose scripts never use it are unaffected. Each call returns a JSON-serializable result the agent can verify. | BEH-005 | Must | Responsibility boundary: acting on the page belongs to the browser MCP (user, SR-009); no pasting of large scripts; survives reloads | P-5; DEC-006; ARCH-DR-001; user SR-009 |
| REQ-007 | The same built-in helper makes actions human-watchable: an animated visible cursor moves to each target before acting, a click indicator appears, typing is visibly paced, and the agent can show/hide an on-screen caption or highlight. Overlays never block interaction and are removed when no longer needed; pages whose scripts never use the helper are unaffected. | BEH-006 | Must | Tutorial quality | User ("some kind of cursor"); P-5 |
| REQ-008 | The browser MCP gains exactly two tools, `start_recording(tab_id, output_file, …)` and `stop_recording(tab_id)` (with CLI equivalents): recording continues in the background across any number of other tool calls, and stop returns an MP4 at a path resolved by the tool's existing workspace-artifact policy, including helper overlays and requiring no OS screen-recording permission. If the tab or app disappears, the recording finalizes itself and a later stop reports it. Existing tools keep their current behavior. Screenshots remain available at any time. | BEH-006 | Must | Responsibility boundary: capturing a page belongs to the browser MCP (user, SR-009) | P-6; DEC-006 |
| REQ-009 | Isolated instances perform no update checks and show no update prompts or update-error messages. | BEH-004 | Must | Clean recordings | P-2 |
| REQ-010 | A root-level guide in the repository (linked from the root README) documents for agents and humans: what an isolated instance is and its guarantees; starting from the installed app and from a source build; connecting and controlling it; screenshots; presentation mode; recording; importing agent packages through the instance UI; stopping and cleanup; model/provider access (DEC-002); troubleshooting (ports, inherited environment, unreachable endpoint); limitations (native OS surfaces, platforms); and links to the existing technical packaging/E2E docs. | BEH-009 | Must | User: "extremely important" | User |
| REQ-011 | Agent-discoverable skills teach the workflow, each documenting its own tool: the isolated-app skill covers the instance lifecycle (start/stop/restart/list, build, keys via importer) and points to the browser-automation skill, whose SKILL.md documents control, the presentation helper and recording. Both are usable by AutoByteus agents through the existing skill mechanism. | BEH-009 | Must | Agents need in-context instructions; responsibility boundary | skill-discovery.ts; user SR-009 |
| REQ-012 | Withdrawn (SR-009) — package import belongs to the application; agents use the instance UI. | — | — | User decision 2026-09-29 | User SR-009 |
| REQ-013 | `run-script` executes async arrow functions (`async (arg) => …`, `async arg => …`). | BEH-007 | Must | Silent no-op bug | P-5 |
| REQ-014 | From a source worktree, one documented command builds the desktop app for the current host and starts an isolated instance of that build (build is opt-in; launching an existing build needs no rebuild). | BEH-008 | Should | Developers validate changes | package.json |
| REQ-015 | An agent given the user's key source file can provision provider credentials into an isolated instance by running the existing `pnpm secrets:import` itself (unchanged importer, interactive `IMPORT` confirmation in a terminal; `script` provides a terminal for agents that cannot type into prompts), targeting the database URL that the lifecycle command reports. Credentials become usable by the instance (restarting it if required). The lifecycle command never imports keys on its own; the production vault is never read. The secret-management documentation states that agents may run the importer. | BEH-003 | Must | Tutorials that run agents need a model; user security policy; established agent practice | User SR-006; ticket evidence `agent-team-hierarchical-handoffs/api-e2e-evidence-*/environment/secrets-import-*.log`; probe P-8 |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | BEH-001/002, SCN-001 | Agent shell inside AutoByteus (inherits `ELECTRON_RUN_AS_NODE=1`), installed app present | Start command returns JSON with instance id, backend URL, control endpoint, data root, pid, log path; backend responds; window visible | Missing app / busy requested port / bad data root → JSON error with actionable message, nothing left running | Executable validation on macOS |
| AC-002 | REQ-002 | BEH-003, SCN-005 | Launch from an environment containing production `AUTOBYTEUS_*`, `DATABASE_URL`, `DB_NAME` values | Isolated server's effective memory/db/package/skill/catalog settings resolve only inside its data root (or defaults); no file under production data locations is opened or modified; UI shows no agents from production package roots | — | Env + open-file inspection; repeat via test harness and manual env launch |
| AC-003 | REQ-004 | BEH-001, SCN-001 | Two isolated instances running beside the main app | List shows both; stopping one ends its process tree and frees its ports; the other and the main app keep working | Stopping an instance whose app was already closed (e.g., the user quit it) → no signals sent, data-root disposition per DEC-003 applied, record removed, result reports `wasRunning:false`; unknown id → clear JSON error | Executable validation |
| AC-004 | REQ-005, REQ-001 | SCN-003 | MCP configured attach-only with the default control port; instance started with defaults | `list_tabs`/`attach_tab`/`screenshot` operate on the instance with no extra configuration | Instance not running → error; no browser process started; start with the control port busy → clear start error | Executable validation |
| AC-005 | REQ-006 | SCN-003 | Isolated instance at the Agents page; browser MCP attached; no prior helper use | The first `run_script` using `__abDemo.*` succeeds without any loading step; each helper action (click, type, key, hover, scroll, select, wait) succeeds by selector and by visible text, verified by a follow-up snapshot; after a renderer reload the next `__abDemo` call works again; a `run_script` that does not mention `__abDemo` leaves no helper in the page; browser MCP tool list unchanged; the same holds for the CLI `run-script` | Not found / ambiguous / timeout → helper returns a structured error value | Unit + integration tests (mcps) + executable validation |
| AC-006 | REQ-007 | SCN-003/004 | Helper in use | Screenshot/recording shows cursor at target before click, click indicator, paced typing, caption on demand; click indicators and hidden captions are removed from the DOM; underlying clicks unaffected | Scripts never using the helper → no overlay elements in DOM | Visual evidence + DOM check |
| AC-007 | REQ-008 | BEH-006, SCN-004 | Tab attached (isolated instance or browser page); `start_recording` called; ≥3 other tool calls (helper actions, screenshots) over separate calls; `stop_recording` called | MP4 exists at the resolved workspace path, plays, duration ≈ session, shows actions and cursor; no OS permission prompt; other tools behaved exactly as without recording | Stop without start → `RECORDING_NOT_ACTIVE`; second start on same tab → `RECORDING_ALREADY_ACTIVE`; tab/app closed mid-recording → recording finalized, stop returns it with the end reason; ffmpeg missing → clear error at start | ffprobe + frame inspection + mcps tests |
| AC-008 | REQ-009 | BEH-004 | Isolated instance started, left idle 2 min | No update toast/prompt/error; production instance still shows update UX as before | — | Visual + store state check |
| AC-009 | REQ-010 | SCN-006 | Repository root | Guide exists at root docs location, linked from README, covers every topic listed in REQ-010 with commands that match the implemented tools | — | Doc review against implementation |
| AC-010 | REQ-011 | SCN-006 | Skill added to an AutoByteus agent | A fresh agent using only the skill completes start → screenshot → record short clip → stop | — | Agent run evidence |
| AC-011 | REQ-012 | — | Withdrawn (SR-009) | — | — | — |
| AC-012 | REQ-013 | BEH-007 | Any tab | `async (arg) => arg.x` returns the value | — | Unit test |
| AC-013 | REQ-014 | SCN-002 | Source worktree | Documented command builds and starts that build isolated; start-without-build uses existing build | Build failure → clear error, nothing launched | Executable validation (macOS) |
| AC-014 | REQ-015 | BEH-003, SCN-005 | Isolated instance started; key source path given to the agent | Following the guide, the agent runs `pnpm secrets:import -- --source <file> --database-url <reported db url>` (interactive or via `script`); the instance Settings shows the provider configured and an agent run can use the model; production database/vault not opened | Piped non-TTY input → existing `IMPORT_CONFIRMATION_REQUIRED`; invalid source/target → existing importer errors | Executable validation |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Agent in AutoByteus | Start/stop a disposable AutoByteus | Agent shell command | Main app running | start → use → stop | Isolated instance runs; stops cleanly | Port busy, app missing | Supported Normal Scenario | User request; P-1/P-2/P-7 | REQ-001/003/004; AC-001/003 |
| SCN-002 | Operational | Developer/implementation agent | Test own source changes in real desktop app | Source worktree command | Worktree with changes | build → start → control → stop | Instance runs that build | Build failure | Supported Normal Scenario | User ("build and connect") | REQ-014; AC-013 |
| SCN-003 | Operational | Recording agent | Drive the app like a human | Browser tool with instance endpoint | Instance running | observe → act (with cursor) → verify → screenshot | Actions visible and verified | Element missing, endpoint down | Supported Normal Scenario | User; P-4/P-5 | REQ-005/006/007/013; AC-004/005/006/012 |
| SCN-004 | Operational | Recording agent | Produce a tutorial clip | Browser MCP `start_recording` / `stop_recording` | Tab attached (isolated instance window or browser page) | start recording → explored/scripted steps with helper captions → stop → (optional narration/editing with existing MCPs) | MP4 of the session in the agent workspace | Target closed mid-recording → recording finalizes itself | Supported Normal Scenario | User (SR-009 "move record to browser mcp"); P-6 | REQ-007/008; AC-006/007 |
| SCN-005 | Operational | Recording agent | Prepare demo content and model access | Instance UI (packages, agents); `pnpm secrets:import` for keys | Instance running | import packages / create demo data through the instance UI → provision keys with the importer → `restart` | Instance contains only demo content and working model access; production untouched | Invalid package → UI error; importer errors | Supported Normal Scenario | User ("agent creates demo data"; package import via application, SR-009; agents run importer, SR-006) | REQ-002/015; AC-002/014 |
| SCN-006 | Operational | Agent / human | Learn the workflow | Root guide / skill | — | read → follow | Workflow completed without prior knowledge | — | Supported Normal Scenario | User (root doc) | REQ-010/011; AC-009/010 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (only UI outcome: suppression of update UX in isolated instances, REQ-009; presentation overlays are injected by the automation tool, not product UI).
- Prototype-specific fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-001 | Performance | Installed-app instance ready (backend responding, window loaded) within 60 s | Developer Mac; probe measured ≈8 s | Timed validation |
| QR-002 | REQ-001, REQ-005 | Security | Control endpoint listens on loopback only and exists only for isolated instances | All hosts | Port binding inspection |
| QR-003 | REQ-002 | Privacy | Zero reads/writes under production data locations by isolated instances | All launch paths | AC-002 |
| QR-004 | All | Compatibility | macOS and Linux (Linux with a graphical display, real or virtual) | Windows out of scope (DEC-004) | Validation on macOS; Linux documented and validated where available |
| QR-005 | REQ-005..008, 013 | Compatibility | Existing browser-automation commands, schema v1 JSON and exit-code categories unchanged | CLI and MCP | Existing test suite |
| QR-007 | REQ-005..008 | Compatibility | Browser MCP public surface gains exactly two tools (`start_recording`, `stop_recording`); other changes are the attach-only configuration setting, the async-arrow fix and the built-in presentation helper inside `run_script`; existing tools keep their connect–operate–disconnect behavior and JSON contract | MCP and CLI | Tool-list check + existing suite |
| QR-006 | REQ-008 | Operability | Recording of ≥5 minutes completes without unbounded memory growth | Window up to Retina 2400×1536 | Long-run validation |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` — production data must be protected; isolated data roots are disposable.
- Data or state that must be preserved: all production AutoByteus data (db, memory, settings, packages, skills, logs).
- Loss acceptable: isolated data roots (per DEC-003 retention).
- Constraints: no production file may be opened by an isolated instance (QR-003).
- Unknowns: complete list of inherited production-specific variables (design).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Electron `--remote-debugging-port` | Exposes CDP for the instance | P-2 | Electron upgrades |
| Playwright CDP attach | Attach/operate on Electron pages | P-4/P-6 | Some browser-level operations not meaningful for Electron |
| ffmpeg | MP4 encoding | P-6 | Must be installed on host; documented |
| `autobyteus-mcps` repository | Hosts browser-automation changes | Source log | Separate branch/finalization |
| `tts-mcp`, `video-audio-mcp` | Used as-is for narration/editing | mcps README | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/probe-01-isolated-app-update-popup.png` | Isolated launch + update toast evidence | REQ-001/009 | Final | Evidence only |
| `evidence/probe-02-fake-cursor-click.png` | Cursor overlay feasibility | REQ-007 | Final | Evidence only |
| `evidence/probe-03-screencast-video-frame.png` | Recording feasibility | REQ-008 | Final | Evidence only |

## Assumptions

| ID | Assumption | Why Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The installed AutoByteus app is v1.4.53+ (has the `e2e` profile) | Default launch source | Start command checks and reports | Open |
| ASM-002 | ffmpeg is available (or installable) on hosts that record | MP4 output | Documented prerequisite; clear error if missing | Open |
| ASM-004 | Script-dispatched (untrusted) DOM events are sufficient for AutoByteus UI interactions used in tutorials | Actions via `run_script` rather than native input | Design verifies representative interactions; limitation documented (native dialogs, OS menus) | Open |
| ASM-003 | The user grants OS permissions when needed | User statement | — | Accepted |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Should this ticket stop at raw recording (MP4 + screenshots + captions), with narration/editing only documented using existing `tts-mcp`/`video-audio-mcp`? | Scope size | Recommended: yes — document the post-production recipe, no new narration/editing tooling | User | Decided — Approved as recommended: stop at recording; document narration/editing with existing MCPs |
| DEC-002 | How does an isolated instance get model/provider access? | Fresh roots have no provider keys | SR-003 automated copy conflicted with the secret-management contract (ARCH-F-001); SR-004 template dropped; SR-005 `--yes` dropped after evidence that agents already run the importer interactively and `script` supplies a TTY (P-8). | User | Decided (SR-006) — agents run the unchanged `pnpm secrets:import` with a user-given key source; docs updated to permit agents |
| DEC-003 | What happens to an isolated data root on stop? | Disk use vs. reuse | Recommended: auto-created roots are deleted on stop unless `keep` is requested; caller-provided roots are never deleted | User | Decided — Approved as recommended: auto-created roots deleted on stop unless keep requested; caller-provided roots never deleted |
| DEC-004 | Platforms | Effort | Recommended: macOS + Linux; Windows out of scope | User | Decided — Approved as recommended: macOS + Linux; Windows out of scope |
| DEC-006 | Where do actions/cursor and recording live? | Tool-surface size and responsibility boundary | User decisions 2026-09-28/29: actions/cursor/captions via existing `run_script` with the presentation helper built into the browser MCP; recording moved to the browser MCP as exactly two tools `start_recording`/`stop_recording` with a background recorder, leaving existing connect–operate–disconnect behavior unbroken ("it belongs to where they are"; "move record to browser mcp … it should not break how it works"); lifecycle command owns only the instance lifecycle | User | Decided (SR-009) |
| DEC-007 | How does the MCP know which app to control? | Configuration simplicity | User decision 2026-09-28: fixed control port; user configures the recording agent's MCP with that port; no per-call target selection | User | Decided |
| DEC-005 | Should agents also be able to record the whole screen (native dialogs, menus) in addition to window recording? | Native OS surfaces are invisible to window recording | Recommended: document an ffmpeg full-screen recipe in the guide only; no tool support now | User | Decided — Approved as recommended: documented ffmpeg full-screen recipe only |

## Traceability

| REQ | Use Cases | Behaviors | ACs | Scenarios | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | P-2 |
| REQ-002 | UC-007 | BEH-003 | AC-002 | SCN-005 | P-3 |
| REQ-003 | UC-001 | BEH-002 | AC-001 | SCN-001 | P-1 |
| REQ-004 | UC-001 | BEH-001 | AC-003 | SCN-001 | P-7 |
| REQ-005 | UC-003 | BEH-005 | AC-004 | SCN-003 | P-4 |
| REQ-006 | UC-003 | BEH-005 | AC-005 | SCN-003 | P-5 |
| REQ-007 | UC-003, UC-004 | BEH-006 | AC-006 | SCN-003, SCN-004 | P-5 |
| REQ-008 | UC-004 | BEH-006 | AC-007 | SCN-004 | P-6 |
| REQ-009 | UC-004 | BEH-004 | AC-008 | SCN-003 | P-2 |
| REQ-010 | UC-006 | BEH-009 | AC-009 | SCN-006 | README |
| REQ-011 | UC-006 | BEH-009 | AC-010 | SCN-006 | skill discovery |
| REQ-012 | — (withdrawn) | — | — | — | — |
| REQ-013 | UC-003 | BEH-007 | AC-012 | SCN-003 | P-5 |
| REQ-014 | UC-002 | BEH-008 | AC-013 | SCN-002 | package.json |
| REQ-015 | UC-007 | BEH-003 | AC-014 | SCN-005 | U-001 |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-006 (after approval).
- Constraints: preserve `production`/`e2e` contract and test harness; browser-automation backward compatibility (QR-005); loopback-only control (QR-002); zero production data access (QR-003).
- Deferred to design: where the lifecycle command lives and how it is packaged/exposed as a skill; sanitization location(s) for inherited environment; how the browser tool selects endpoints; how recording persists across short-lived CLI calls; presentation overlay mechanism; update-UX suppression mechanism; package import mechanism; DEC-002 mechanism.
- Technical facts to verify: full list of production-specific server variables; Playwright CDP behavior for multiple Electron windows/webviews; ffmpeg availability on Linux; Linux display requirements.
- Known risks: cross-repo delivery (mcps); native OS surfaces not recordable in window mode.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-09-28, conversation)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-009, repaired in SR-010; no behavior-defining supplements)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
