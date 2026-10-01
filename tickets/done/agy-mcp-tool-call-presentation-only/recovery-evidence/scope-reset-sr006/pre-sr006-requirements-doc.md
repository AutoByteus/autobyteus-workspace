# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `agy-mcp-tool-call-presentation`
- Request / ticket: Show the real MCP tool name and arguments for Antigravity runs instead of `call_mcp_tool`
- Requirements owner: Solution Designer
- Date: 2026-10-01
- Approval state and reference: `Approved — recovered explicit user intent and current continuation`. Original AGY baseline/DEC-001..005 approval remains the 2026-09-30 statement recorded at SR-002. Added scope is supported by the recovered original conversation: user asked to investigate/fix the 43 failures (line 315), then after the two production defects were explained (992), requested fixes on the current ticket (995, 1015). On 2026-10-01, after Solution Designer explicitly summarized the two fixes, passing E2E and incomplete unit/integration work, user instructed: "We should continue ... please trigger the next handoff so that we need to finish the ticket." User then required latest origin/personal before continuation; DR-003 fulfills that prerequisite.
- Exact approved requirements baseline: SR-005 is the present canonical recovery of those explicitly approved outcomes, NOT a claim this document or design existed on September 30. REQ-001..007 / AC-001..008 unchanged; added REQ-008..011 / AC-009..014 formalize the recovered repair request without authorizing unspecified new product behavior.
- Approval evidence: `recovery-evidence/test-repair-provenance-20261001/conversation-excerpts.md` (original lines/timestamps) and the current conversation after `test-repair-provenance-result-20261001.md`. Initial testing/release direction: `user-finalize-release-request-20261001.md`; not a claim of final verification of the refreshed candidate.
- Behavior-defining supplements: None. `test-repair-scope-inventory.md` is an evidence/scope index under REQ-010/011, not permission to change product behavior.
- Design phase gate: user intent above is approved; architecture recovery must occur next and be classified independently. No existing source patch, former direct-route pass or historical test total is accepted as combined implementation readiness.

## Problem And Desired Outcome

- Problem: In Antigravity (AGY) runs every MCP tool call appears in the Activity panel and conversation as the generic `call_mcp_tool`, with the real tool name and arguments buried inside a wrapper (`ServerName`, `ToolName`, `Arguments`). The user cannot see at a glance which tool ran. Other runtimes show the real tool (for example `send_message_to`).
- Affected actors or systems: Users observing AGY runs (standalone, Team and Org members); server consumers of tool events.
- Desired outcome: An AGY MCP tool call is presented as the tool that was actually called, with that tool's own arguments.
- Added repair outcome: finish user-requested stale-test/setup repairs on this ticket and retain the two diagnosed history/migration fixes, without weakening current product contracts or losing existing work/data.
- Observable definition of success: For the screenshot case, the Activity item is titled `delegate_task` and its Arguments section shows `{description, recipient_address}` only.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | AutoByteus agent tools called by AGY show as `call_mcp_tool` with wrapper arguments | Shown under the tool's canonical name (e.g. `delegate_task`, `send_message_to`) with the tool's own arguments | Status, timing, invocation identity and result content | Investigation notes BEH-001 |
| BEH-002 | System | SCN-002 | Tools on other MCP servers show as `call_mcp_tool` | Shown under a name identifying the server and tool (format per DEC-002) with the tool's own arguments | Same as BEH-001 | Investigation notes BEH-002 |
| BEH-003 | System | SCN-001 | AGY native tools show under their native names | Unchanged | Entire behavior | Investigation notes BEH-003 |
| BEH-004 | System | SCN-003 | A failed MCP call shows as a failed `call_mcp_tool` | Failure is shown under the real tool name with the real arguments | Failed/denied classification and error text | Investigation notes BEH-004 |
| BEH-005 | System | SCN-001 | Only AGY's native `generate_image` triggers native image path resolution | Unchanged: an MCP tool that happens to be named `generate_image` is never treated as AGY's native image tool | Entire behavior | Investigation notes BEH-005 |
| BEH-006 | User | SCN-004 | Stored AGY runs replay the stored tool name | Runs recorded before this change keep showing `call_mcp_tool` (DEC-004) | Stored runs remain readable | Investigation notes BEH-006 |
| BEH-007 | User / Operational | SCN-005 | A Team creation refused on an unreadable history index previously wrote an orphan package first | Refuse before creating a Team run package; preserve unreadable index bytes | No new global startup or unrelated Agent-work restriction | SR-004/005 evidence, DR-003 |
| BEH-008 | System / Operational | SCN-006 | Failed cutover retry rejects valid current unversioned flat Team trees as old-format candidates | Keep valid current Team packages untouched while eligible old nested-Team histories convert to Orgs | Unsupported/missing sources retained, narrow admission and terminal-ledger behavior unchanged | Migration guideline, recovered defect/evidence |
| BEH-009 | Operational | SCN-007 | Broad test failures include stale contracts/setup plus genuine defects; initial reports omitted follow-up repairs | Repair/update supported tests; identify obsolete cases and actual defects honestly; rerun combined suites | No production weakening or manufactured passing results | User repair request and archived logs |
| BEH-010 | Contract | SCN-005, SCN-006 | Existing migration runner isolates history availability and terminal records; current admission validates packages | Preserve availability of independent new work, valid current identity and retained historical bytes | No global gate, ledger reset or speculative destructive recovery | Canonical migration guideline |


## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User observing an AGY run | Understand what the agent did | Real tool name and arguments visible without expanding a wrapper | Same look as other runtimes for AutoByteus tools |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Presenting an AGY call to an AutoByteus agent tool | SCN-001, SCN-003 |
| UC-002 | Presenting an AGY call to a tool on another MCP server | SCN-002, SCN-003 |
| UC-003 | Presenting an AGY MCP call whose wrapper is incomplete | SCN-003 |
| UC-004 | Refuse unrecordable Team creation without leaving a package | SCN-005 |
| UC-005 | Retry failed historical cutover alongside valid current Team packages | SCN-006 |
| UC-006 | Repair and verify the observed server test cohort on the combined ticket | SCN-007 |

### Out Of Scope

- Hiding or merging the native `view_file` schema lookups AGY performs before an MCP call.
- Changing how other runtimes (Codex, Claude, Grok, AutoByteus) name or present tools.
- Relabelling already-stored AGY calls; the separately recovered historical Team-to-Org migration retry fix is in scope, with no new bulk data rewrite.
- Changing how AGY is configured to reach MCP servers, or which tools it is granted.
- Frontend layout or styling of Activity items.

### Non-Goals

- Restoring removed skillAccessMode/current nested-Team APIs to satisfy stale tests.
- Arbitrary new production fixes outside REQ-008/009, automatic corruption repair, speculative multi-writer recovery, resetting migration ledgers, or unrelated frontend work. New product defects must return for explicit scope/design recovery.
- Achieving green tests by deleting valid assertions, adding skips/expected-failure markers, or silently removing the requested repair scope.

- Guaranteeing the presentation for future AGY versions that change the undocumented wrapper shape beyond the fallback in REQ-004.

### Preserved Behavior Boundary

BEH-003, BEH-005, the preserved columns of BEH-001/002/004, BEH-006 and BEH-010. Existing current flat-Team, Org, collaborator, skill-removal and graph-local lifecycle contracts remain authoritative for test repair.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | For an AGY MCP call to the AutoByteus agent tools server, every tool event for that call (start, success, failure, denial) carries the tool's canonical bare name, identical to the name shown for the same tool in other runtimes. | BEH-001, BEH-004 | Must | User request; parity with other runtimes | User request 2026-09-30 |
| REQ-002 | For every AGY MCP call whose name is presented per REQ-001 or REQ-003, the arguments presented are exactly the arguments passed to the MCP tool, without the `ServerName` / `ToolName` / `Arguments` wrapper. An empty argument set is presented as empty. | BEH-001, BEH-002, BEH-004 | Must | User request | User request 2026-09-30 |
| REQ-003 | For an AGY MCP call to any other MCP server, every tool event carries the name `mcp__<server>__<tool>`, which cannot be mistaken for an AutoByteus platform tool. | BEH-002, BEH-004 | Must | Real tool visible without colliding with platform tool semantics | DEC-001, DEC-002 |
| REQ-004 | If an AGY `call_mcp_tool` step does not provide a usable server name and tool name, the call is presented as it is today (`call_mcp_tool` with the provider's parameters) and the run continues without error. | BEH-001, BEH-002 | Must | Provider shape is undocumented | RSK-001 |
| REQ-005 | AGY native tool presentation and native image handling are unchanged; an MCP tool is never treated as an AGY native tool because of its name. AutoByteus media tools called through MCP are recognized by the platform under their canonical names, as in other runtimes (DEC-005). | BEH-003, BEH-005 | Must | Preserve existing behavior | Existing unit test |
| REQ-006 | The name and arguments of one call are the same in its start event and its terminal event. | BEH-001, BEH-002, BEH-004 | Must | One Activity item per call, no relabelling mid-call | Investigation (both steps carry full parameters) |
| REQ-007 | The result of an unwrapped AGY MCP call keeps today's `{provider_state, output}` shape. When the tool's output text is a JSON object or array, `output` is presented as that structured JSON; any other output is presented unchanged. | BEH-001, BEH-002 | Must | Parity with how other runtimes present MCP results | DEC-003 |
| REQ-008 | When new Team creation is already disallowed because its history index is unreadable, it must fail without writing a new Team run package or overwriting that index. Valid/missing indexes retain normal creation behavior. Unrelated Agent work and application availability are unchanged. | BEH-007, BEH-010 | Must | Fix diagnosed orphan, not introduce a new availability policy | Recovered user repair approval after original report 992 |
| REQ-009 | On an eligible failed/pending Team-to-Org cutover retry, valid current unversioned flat Team packages must remain byte-preserved non-targets and must not prevent supported historical candidates converting. Preserve existing invalid/missing-source dispositions, identity and reference validation, and terminal success skipping. | BEH-008, BEH-010 | Must | Fix diagnosed stuck retry without rewriting current history | Same approval; canonical migration guideline |
| REQ-010 | Investigate and finish the known server E2E/unit/integration repair cohort: update stale tests against supported current contracts, repair test prerequisites/isolation, and justify obsolete-case replacements. Every historical failure must have a current evidence-backed disposition. Genuine new product defects or ambiguous intended behavior return for scoped recovery instead of silently broadening production changes. | BEH-009 | Must | User asked whether failures were old tests or genuine defects, and requested repair on this ticket | Original conversation 315, 995, 1015; current continue-to-finish instruction |
| REQ-011 | Combined validation must use the integrated latest-base source, fresh required builds and isolated test-owned state. Full unit/architecture, integration and deterministic E2E runs must report actual failures/errors/skips; repaired tests must pass and valid assertions must not be weakened merely to obtain green results. No release-readiness claim while required outcomes or material failure dispositions remain unresolved. | BEH-009, BEH-010 | Must | Truthful completion and preserved user data/work | User latest-base prerequisite; TESTING.md |


## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-006 | BEH-001 / SCN-001 | AGY run calls `delegate_task` on the AutoByteus agent tools server with `description` and `recipient_address` | Start and success events carry tool name `delegate_task` and arguments `{description, recipient_address}`; the Activity panel shows one item titled `delegate_task` with those arguments | — | Converter unit test; live AGY run observed in the app |
| AC-002 | REQ-001 | BEH-001 / SCN-001 | AGY run calls `send_message_to` | Item is titled `send_message_to`, same as for a Codex or Claude run | — | Unit test; live run |
| AC-003 | REQ-002, REQ-003 | BEH-002 / SCN-002 | AGY run calls tool `echo_args` on a third-party server `shape-test` with nested arguments | Name is `mcp__shape-test__echo_args`; arguments equal the nested object the server received | — | Unit test with probe-derived fixture |
| AC-004 | REQ-002 | BEH-001 / SCN-001 | MCP call with no arguments | Arguments presented as an empty object | — | Unit test |
| AC-005 | REQ-001, REQ-002, REQ-006 | BEH-004 / SCN-003 | MCP tool returns an error | The failed (or denied) event carries the real tool name and arguments and the provider's error message | — | Unit test with probe-derived fixture |
| AC-006 | REQ-004 | SCN-003 | `call_mcp_tool` step with missing or blank `ToolName` or `ServerName` | Presented as `call_mcp_tool` with provider parameters; no exception; run continues | — | Unit test |
| AC-007 | REQ-005 | BEH-003, BEH-005 / SCN-001 | Native `view_file`, `run_command`, native `generate_image`; and an MCP tool named `generate_image` | Native items unchanged; native image path resolution runs only for the native tool | — | Existing and extended unit tests |
| AC-008 | REQ-007 | BEH-001 | Successful MCP call returning JSON object text; another returning plain text | First: `output` is the structured object; second: `output` is the unchanged text; both keep `provider_state` | — | Unit test |
| AC-009 | REQ-008 | BEH-007,010 / SCN-005 | Isolated built server with unreadable Team history index; user requests new Team | Request fails; Team package directory set and index bytes unchanged; no Team run admitted | Missing/valid index allows normal creation | Focused service unit plus real server E2E |
| AC-010 | REQ-009 | BEH-008 / SCN-006 | Failed cutover becomes eligible after supported correction, with current unversioned flat Team(s) and valid old nested-Team source | Current packages unchanged; eligible source converts to Org and is usable through current API | Invalid or missing sources are not accepted as current, retained with truthful existing dispositions | Migration unit fixtures and built-server restart/restore |
| AC-011 | REQ-008,009 | BEH-010 / SCN-005,006 | Mixed valid/invalid history, all historical roots excluded, or already-terminal migration | App and independent Agent work usable; affected invalid history unavailable; terminal SUCCEEDED/SUCCEEDED_WITH_WARNINGS conversion not rerun | No aggregate-failure global startup gate or ledger reset | Existing/repaired migration/startup tests with byte/attempt checks |
| AC-012 | REQ-010,011 | BEH-009 / SCN-007 | Reproduce historical inventory on integrated source | Each failed file/case is mapped to stale-test/setup/real-defect/obsolete classification with source evidence; retained repaired cases pass; full unit/architecture, integration and E2E results recorded, including unhandled errors | Any unresolved genuine defect or external limitation remains explicitly non-passing and routed, not hidden | Owned implementation checks and API/E2E ledger |
| AC-013 | REQ-010 | BEH-009 / SCN-007 | Repair assertions, fixtures, removed API or nested-Team cases | Tests assert supported flat-Team/Org/current launch behavior; released migration input/output fixtures retain historical fields; no new skip/only/it.fails or production guard weakening to mask failures | Product-contract ambiguity returns to Solution Designer | Source/test review and executable evidence |
| AC-014 | REQ-011 | BEH-009 / SCN-007 | Deterministic E2E and application integration on a clean build | Built server and required Brief Studio package current; test-owned DB/state and process cleanup; suite failures are reproducible independently of ambient user profile | Live-provider skips reported separately, never counted as passes | Build/preflight, isolated target proof and full-suite reruns |


## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | AGY model in an AutoByteus-managed run | Agent uses an AutoByteus agent tool | Run with AGY runtime and agent tools enabled | Run active | Model calls the tool through AGY's MCP call; tool executes; user watches Activity | Item shows the real tool name and arguments | Native tools in the same turn are unaffected | Supported Normal Scenario | User screenshot; investigation BEH-001 | REQ-001, 002, 005, 006 / AC-001, 002, 004, 007 |
| SCN-002 | System | AGY model | Agent uses a tool from another MCP server available to AGY | AGY discovers a user/workspace-configured MCP server | Run active | Same as SCN-001 | Item shows server-qualified real tool name and arguments | — | Supported Normal Scenario (AGY reads user/workspace MCP config; scope subject to DEC-001) | Probe; prior ticket investigation | REQ-002, 003 / AC-003 |
| SCN-003 | System | MCP server / AGY provider | An MCP call fails, is denied, or arrives with an incomplete wrapper | Same as SCN-001/002 | Run active | Provider reports ERROR, or omits the tool name | Failure shown under the real name; incomplete wrapper falls back to today's presentation | — | Supported Normal Scenario (failure); Supported Explicit Edge Scenario (incomplete wrapper, RSK-001) | Probe error step | REQ-004, 006 / AC-005, 006 |
| SCN-004 | User | User | Reopen an AGY run recorded before this change | Select the run in history | Stored run exists | History replays stored events | Old items still read `call_mcp_tool` | — | Supported Normal Scenario | DEC-004 | BEH-006 |
| SCN-005 | User / Operational | User launching Team; existing index preservation contract | Failed creation leaves no new orphan | Normal Team launch while its catalog index is unreadable | Existing index bytes cannot be safely replaced; other app work available | Launch Team; receive refusal; inspect unchanged package/index; independent Agent work continues | No new Team package or index destruction | Valid/missing index permits launch; not a promise against arbitrary concurrent disk failure | Supported Explicit Edge Scenario | User explicitly approved diagnosed defect repair; existing strict catalog read and repair runbook | REQ-008 / AC-009,011 |
| SCN-006 | System / Operational | Migration runner on ordinary eligible restart | Complete historical cutover without mistaking current Teams for old sources | Restart-to-retry after correcting failed migration prerequisite | Pending/failed cutover, valid current Team(s), investigated released nested-Team source and retained exclusions | Restart; classify candidates; preserve current Teams; convert supported histories; use admitted Org | Current Teams unchanged and supported converted history usable | Missing/invalid sources retained; terminal successes skip; independent work remains available | Supported Explicit Edge Scenario | Recovered defect report; guideline sections 6–9; same-ID runner retry | REQ-009 / AC-010,011 |
| SCN-007 | Operational | Engineer/CI under user's explicit repair request | Trustworthy server test outcomes on this combined ticket | Run maintained tests from current integrated worktree | Historical cohort and newly built disposable test environment | Reproduce; compare contract; repair fixture/setup or identified two fixes; rerun; report every result | Repaired supported tests pass; unresolved issues truthful and actionable | Genuine new behavior question routed; approved opt-in provider gates explicit | Supported Normal Scenario (engineering contract) | User 315/995/1015 and current continuation; TESTING.md | REQ-010,011 / AC-012..014 |


## UI, Interaction, And Experience Requirements

- Applicable: `No` — no new UI; existing Activity items display different name and argument values.
- All prototype-specific fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004 / AC-006 | Reliability | An unexpected wrapper shape never fails the turn | Any `call_mcp_tool` step | Unit test |

## Data Continuity And Acceptable Loss

- Persisted data affected: new AGY event values as before, plus the recovered Team creation and existing cutover retry defects. Current Team packages and unreadable indexes must be preserved; existing supported historical conversion remains migration-owned.
- Data to preserve: old AGY presentation, valid current Team bytes, unreadable index bytes, retained unsupported historical sources, exact identity/reference/accounting semantics. Only the already-supported old Team-to-Org conversion may transform its selected historical targets.
- Loss, reset, rebuild, or regeneration that is acceptable: Old runs keep the `call_mcp_tool` presentation (DEC-004).
- Retention, privacy, compliance, volume, downtime, or operational constraints: None identified.
- Remaining evidence work: current failure origins and refreshed combined validation. This does not authorize new product behavior; use REQ-010 recovery boundary.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| AGY CLI stream step for `call_mcp_tool` | Provides `ServerName`, `ToolName`, `Arguments` on start and terminal steps | Probes on AGY 1.2.10 and 1.2.14 | Undocumented; RSK-001 |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `agy-mcp-call-shape-probe.py`, `agy-mcp-call-shape-probe/` | Raw provider evidence | REQ-001..004 | Complete | Evidence only |
| `test-repair-scope-inventory.md` | Finite historical repair cohort, source owners and validation rules | REQ-010,011 | Recovered at SR-005 | Evidence/scope index; requirements above govern behavior |
| `recovery-evidence/test-repair-provenance-20261001/`, `latest-base-integration-result-20261001.md` | Original user direction, historical logs and current focused integration evidence | REQ-008..011 | Historical/current sources distinguished | Approval evidence only where exact user statements cited |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user wants server events changed (so every consumer sees the real tool), not a frontend-only relabel | Determines where names are interpreted | Confirm with approval | Confirmed by approval |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Are tools on non-AutoByteus MCP servers in scope? | Scope of REQ-003 | **Decided: all MCP calls are unwrapped.** | User | Resolved 2026-09-30 |
| DEC-002 | How are non-AutoByteus tools named? | A bare name like `write_file` or `generate_image` would be read by the server as a platform tool and create wrong Files entries | **Decided: `mcp__<server>__<tool>`**; AutoByteus agent tools keep bare canonical names. | User | Resolved 2026-09-30 |
| DEC-003 | Should the result presentation change? | Today the result is `{provider_state, output}` with `output` as raw text, so JSON results appear as an escaped string | **Decided: keep `{provider_state, output}`; show JSON object/array text as structured JSON in `output`.** | User | Resolved 2026-09-30 |
| DEC-004 | Should runs recorded before the change be relabelled? | Old history keeps `call_mcp_tool` | **Decided: no; old runs are left alone** (explicit user statement). | User | Resolved 2026-09-30 |
| DEC-005 | With real names, AutoByteus media tools called through MCP (`generate_image`, `edit_image`, `generate_speech`, `generate_video`) will be recognized by the server as generated-output tools, as in other runtimes, and may add entries to Files. Accept? | Visible side effect beyond the label | **Decided: accept.** | User | Resolved 2026-09-30 |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-004 | AC-001, AC-002, AC-005 | SCN-001, SCN-003 | Probe |
| REQ-002 | UC-001, UC-002 | BEH-001, BEH-002, BEH-004 | AC-001, AC-003, AC-004, AC-005 | SCN-001, SCN-002, SCN-003 | Probe |
| REQ-003 | UC-002 | BEH-002, BEH-004 | AC-003 | SCN-002 | Probe |
| REQ-004 | UC-003 | BEH-001, BEH-002 | AC-006 | SCN-003 | — |
| REQ-005 | UC-001 | BEH-003, BEH-005 | AC-007 | SCN-001 | Existing unit test |
| REQ-006 | UC-001, UC-002 | BEH-001, BEH-002, BEH-004 | AC-001, AC-005 | SCN-001, SCN-003 | Probe |
| REQ-007 | UC-001, UC-002 | BEH-001, BEH-002 | AC-008 | SCN-001 | Probe |
| REQ-008 | UC-004 | BEH-007,010 | AC-009,011 | SCN-005 | Recovered user direction; strict index/store behavior; DR-003 |
| REQ-009 | UC-005 | BEH-008,010 | AC-010,011 | SCN-006 | Migration guideline; released/current source investigation |
| REQ-010 | UC-006 | BEH-009 | AC-012,013 | SCN-007 | test-repair-scope-inventory.md; original repair request |
| REQ-011 | UC-006 | BEH-009,010 | AC-012,014 | SCN-007 | Latest-base direction; TESTING.md |


## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-007 at SR-005. Preserve original AGY design; add narrow Team preflight, migration retry recognition and test-repair design after this approval recovery.
- Constraints: BEH-003/005/006/010, unchanged AGY event schema, narrow history admission, existing current runtime contracts and migration guideline. Do not extend original Small/Low classification to added persisted-data scope.
- Decisions intentionally deferred to architecture design: where the unwrap lives; reuse of the shared agent-tools naming helper; whether server details are redacted from AGY payloads as in Codex.
- Technical facts to verify: latest integrated source contracts, strict-index preflight ownership, frozen source classifier versus current tolerant reader, failed/terminal migration handling, finite test-repair inventory and isolation prerequisites.
- Known feasibility or integration risks: RSK-001, RSK-002.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes` — evidence supplements linked; Product UI specification N/A
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
