# Nested Classroom Three-Runtime Live Validation Contract

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/nested-classroom-live-validation-contract.md`
- Purpose: Define the required later live API/E2E validation fixture, runtime/model matrix, secret-import isolation, observable assertions, and evidence standard for the comprehensive AgentTeam refactor.
- Scope: Downstream API/E2E investigation and execution after implementation and source review; no live provider call is part of solution design.
- Status: `Refined — SR-024 package aligned with exact-four-family first-native-boundary Codex admission, rejection no-effect proof, sole downstream diagnostic, complete canonical consumer proof, and the Team stream/concrete-execution contract`
- Approval applicability: This supplement defines intended verification behavior. The user explicitly required one imported nested-classroom example AgentTeam and live coverage across AutoByteus, Codex App Server, and Claude Agent SDK, including the stated GPT-5.6 Luna selections and use of `$HOME/.autobyteus/server-data/.env` through the repository secret importer. SR-019 adds real provider lifecycle proof; SR-020 adds complete deterministic consumer proof; SR-021 restores the original three error variants; SR-022 fixes the sole downstream diagnostic wording and exact four-event Codex omission policy; SR-023 moves its single invocation before pending-MCP/local-event/raw-debug effects and adds admitted controls; SR-024 removes the unreachable unknown-event/exemption machinery and keeps coverage on the four real families. The live matrix must contain no unexpected lifecycle diagnostic. This does not change the approved runtime/model/secret matrix.
- Related requirements: R-021, R-044–R-056
- Related acceptance criteria: AC-019, AC-040–AC-051
- Exact system-instruction copy: [agent-team-collaboration-system-instruction.md](./agent-team-collaboration-system-instruction.md)
- Exact Team stream/execution projection contract: [team-stream-execution-projection-contract.md](./team-stream-execution-projection-contract.md)
- Exact Agent segment lifecycle contract: [agent-segment-lifecycle-contract.md](./agent-segment-lifecycle-contract.md)

## 1. Purpose And Ownership

The downstream `api_e2e_engineer` owns the final coverage investigation, environment preparation, live execution, evidence, and truthful result classification. This contract fixes the required scenario and safety boundary without prescribing the final test-file layout.

The validation must prove the integrated behavior through the supported package-import and TeamRun launch surfaces. Unit-only mocks, direct construction of private managers, or three provider-adapter snapshots do not replace the required live matrix.

## 2. Source Fixture And Test-Owned Staging

The authoritative source fixture currently exists at:

```text
/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test
```

Its observed topology is:

```text
/                                      Nested Classroom Test Team
├── /Teacher                           root coordinator Agent
└── /StudentStudyGroup                 nested AgentTeam
    ├── /StudentStudyGroup/student_one nested coordinator Agent
    └── /StudentStudyGroup/student_two nested member Agent
```

The test must create an isolated Agent package root, copy the `nested-classroom-test` fixture into its `agent-teams/` directory, and import that staged package through the supported Agent-package import boundary with `sourceKind: "LOCAL_PATH"` and an absolute `source`. The public GraphQL `importAgentPackage` mutation is the preferred end-to-end entry point. The imported definition is then used to create and launch one fresh example TeamRun for each runtime-matrix row.

The source package is read-only test input. The test must not edit, register mutable state inside, or write generated output to `/Users/normy/autobyteus_org/autobyteus-private-agents`.

The current fixture prose still describes the superseded `{target:{kind,name}}` task selector and its configs contain no handoffs. Therefore the isolated staged copy may receive only these test-owned target-contract updates before import:

1. replace old task-tool examples with `delegate_task({recipient_address:"./StudentStudyGroup", ...})`;
2. add a small deterministic handoff graph needed to exercise non-empty `{when,recipient_address}` projection; and
3. preserve the original member references, coordinators, roles, and task-lifecycle instructions.

Use this exact deterministic handoff overlay in the staged root Team config, after its existing fields:

```json
{
  "handoffs": [
    {
      "from": "/Teacher",
      "to": "/StudentStudyGroup",
      "rules": [
        "When the user asks to send the classroom handoff token to the study group."
      ]
    },
    {
      "from": "/StudentStudyGroup/student_one",
      "to": "/Teacher",
      "rules": [
        "When the delegated classroom task is finished and the teacher needs the outcome."
      ]
    }
  ]
}
```

Use this exact deterministic handoff overlay in `StudentStudyGroup`'s local Team config:

```json
{
  "handoffs": [
    {
      "from": "/student_one",
      "to": "/student_two",
      "rules": [
        "When the delegated classroom task asks the coordinator to consult the supporting student."
      ]
    }
  ]
}
```

The first array is parent-authored because its second edge crosses the nested-Team boundary; the third edge stays Team-local and is rebased during mounting. This also makes edge/rule order and expected canonical destinations reproducible.

`get_handoff_rules` and `send_message_to` must **not** be added merely to make the Team protocol available. Their availability must come from the implemented intrinsic Team-runtime composition. The staged package and its exact diff or generated manifest must be retained as redacted test evidence so the scenario is reproducible.

## 3. Isolated Secret Import

The existing local assignment file is:

```text
$HOME/.autobyteus/server-data/.env
```

Before starting the isolated test server, import it into a test-owned database with the repository command:

```bash
pnpm secrets:import -- \
  --source "$HOME/.autobyteus/server-data/.env" \
  --database-url "file:<absolute-path-to-isolated-test-db>"
```

Requirements:

- resolve the source from the invoking user's real home before changing any test `HOME` or application-data root;
- use an absolute, disposable, test-owned database path;
- do not use `--overwrite` against any non-test database;
- never print, snapshot, attach, or persist secret values in test output;
- evidence may record only secret identifiers/presence and the import exit result; and
- a missing assignment, failed import, unavailable provider credential, or unavailable runtime is `Blocked`/`Fail` evidence, never a passing or silently skipped matrix row.

## 4. Required Runtime And Model Matrix

Every member in a scenario—`Teacher`, `student_one`, and `student_two`, including task-scoped descendants—uses that scenario's runtime/model configuration. Each row launches a fresh root TeamRun and records the effective configuration returned by the runtime/catalog boundary.

| Scenario | `runtimeKind` | Required model/configuration |
| --- | --- | --- |
| AutoByteus | `autobyteus` | `llmModelIdentifier: "gpt-5.6-luna"` |
| Codex App Server | `codex_app_server` | `llmModelIdentifier: "gpt-5.6-luna"`; `llmConfig.reasoning_effort: "medium"` |
| Claude Agent SDK | `claude_agent_sdk` | Select an authenticated Claude model actually exposed by the live runtime catalog after secret import; record the exact model identifier and effective configuration in evidence. Do not substitute an AutoByteus/OpenAI model identifier. |

The user fixed the GPT-5.6 Luna choices for AutoByteus and Codex but did not fix a Claude model identifier. Hard-coding a guessed Claude identifier would make the test less truthful than selecting from the authenticated runtime catalog.

## 5. Fresh-Run Scenario Spine

For each matrix row:

```text
isolated app-data root + isolated secrets database
  -> stage one nested-classroom Agent package
  -> importAgentPackage(LOCAL_PATH, absolute staged root)
  -> discover Nested Classroom Test Team
  -> apply one runtime/model launch configuration to all members
  -> create and launch a fresh root TeamRun
  -> inspect schema-v3 rooted metadata and canonical addresses
  -> exercise intrinsic get_handoff_rules and send_message_to
  -> exercise recipient_address AgentTeam coordinator routing
  -> exercise delegate_task recipient_address and task-Team lifecycle
  -> observe real provider START(type) -> CONTENT(no type) -> END(no type) through AgentRun canonical enrichment
  -> observe the exact validated Team WebSocket event sequence and concrete frontend executions
  -> terminate and restore the root TeamRun where the supported live harness permits
  -> collect redacted provider/runtime/events/history evidence
  -> terminate processes and remove disposable state
```

No TeamRun, provider session, task execution, or history directory may be reused across runtime rows.

## 6. Required Observable Assertions

Each live row must establish all applicable observations through public/runtime-visible surfaces:

1. package import discovers exactly the staged nested-classroom definition and launch creates a fresh TeamRun;
2. rooted metadata contains `/`, `/Teacher`, `/StudentStudyGroup`, `/StudentStudyGroup/student_one`, and `/StudentStudyGroup/student_two`, with `/Teacher` and `/StudentStudyGroup/student_one` as the configured coordinators of their respective Teams;
3. Team-bound Agents receive intrinsic `get_handoff_rules` and `send_message_to` even though package tool configuration does not add them;
4. the provider-visible collaboration instruction matches `agent-team-collaboration-system-instruction.md` after substituting the caller address, including the explanation-first filesystem metaphor and the natural finish-or-blocked handoff check;
5. `get_handoff_rules` returns only ordered `{handoffs:[{when,recipient_address}]}` guidance (or exactly `{handoffs:[]}` for a deliberately no-edge caller) without the generic success envelope or redundant caller/source fields;
6. `send_message_to({recipient_address:"./StudentStudyGroup", ...})` from `/Teacher` reaches `/StudentStudyGroup/student_one` exactly once and records truthful source/recipient execution addresses;
7. a nested Agent can address its peer relatively and the root coordinator absolutely without a flat-name, representative, or root/local fallback;
8. `delegate_task({recipient_address:"./StudentStudyGroup", ...})` from `/Teacher` creates a task AgentTeam, enters through `student_one`, completes `submit_task_result`/`review_task_result`, and retains the current task-owned lifecycle;
9. persistent and task executions sharing a logical address remain distinct through typed run IDs and `TeamExecutionAddress`;
10. every observed Agent/task/communication/member-input Team message passes the exact strict all-snake-case wire contract—including nested execution-address fields—without aliases, duplicate receiver identity, arbitrary fields, or partially parsed dispatch;
11. frontend task Agent, task Team, and nested task-Team Agent projections contain real TeamRun/AgentRun IDs, leave rooted topology unchanged, and expose no placeholder ID or raw serialized execution-key label; and
12. termination/restoration, when exercised, preserves the launch-time rooted topology and handoff snapshot while the concrete execution projection converges through the same lifecycle owner;
13. Team collaboration produces one canonical communication projection and one exact recipient input—never additional derived Agent collaboration messages;
14. Team approve/deny commands carry invocation ID plus exact execution address and no `approval_token`, while message/interrupt commands likewise use a required exact address; and
15. the one closed canonical metadata/lifecycle/focus/Agent-seed projection builder creates a launched frontend context with run-ID/execution-address-free immutable topology and one persistent execution per metadata node; lifecycle comes from launch/resume, seed coverage is exact, the root Team ID derives from its execution address, only child persistent Teams retain child bindings, effective launch configuration derives from topology, and application producer context belongs to the exact concrete Agent execution—including task-address rebinding. Agent-local state remains single-owned by AgentContext rather than copied into execution records, and no provisional or duplicate run/lifecycle/config/hydration/subscription field exists. Team group rows remain non-focusable, a task-Team coordinator Agent row appears only after its real Agent execution exists, task Agent/Team executions reference one task ID while active/history views derive from one monotonic retained task projection, and complete-root-record-confirmed terminal cleanup retains the task and descendant projections; and
16. application-level Team stream readiness follows exact post-binding `CONNECTED {session_id}`, while `TEAM_RUN_LIFECYCLE {is_active}` updates the already-bound root persistent-Team execution; neither control message repeats a TeamRun identity; and
17. task activation/result/status/token observations correlate by root-TeamRun-scoped task ID plus exact execution address, with no synthetic task Agent/Team instance ID, copied owner/parent/run/time bundle, generic `task_context`, separate activation run-ID result, or current token root/member/task-run identity field. Two independently launched classroom roots may both allocate `task_0001` without collision because cross-root inspection uses `{rootTeamRunId,taskId}` and concrete projection uses the address. Root-scoped token history remains queryable through `token_usage_ledger_events_execution_root_observed_at_idx` after canonical schema contraction;
18. initial Team connection/open/restore status for persistent `/Teacher`, a task Agent where exercised, and `/StudentStudyGroup/student_one` inside a task AgentTeam uses the same exact `agent_execution` and Agent-status DTO as a live status. The task-Team Agent carries its genuine member AgentRun ID exactly once; no TeamRun ID, Agent name/runtime/raw-ID, task alias, second execution address, generic Team message, or fabricated TeamRun event is observed; and
19. send/delegation to an unmaterialized persistent/task/task-Team Agent produces exact initializing or error feedback through the same Agent-status browser transition, preserves activation-before-child ordering, and the first matching real Agent status replaces the temporary overlay. A different execution at the same logical member address is not cleared or overwritten; and
20. ordinary provider text and at least one applicable non-text/tool/reasoning segment are observed from real provider/native source through the common AgentRun lifecycle and complete consumer fan-out. Source content/end omits `segment_type`; canonical Team content contains the start-owned type; browser rendering has no protocol-error card/guessed text/unexpected lifecycle diagnostic; repeated identical deltas remain repeated; and standalone/Team application text projection agrees where exposed. A fabricated per-content source type does not satisfy this assertion.
21. deterministic pre-live coverage proves file-change start/content/end without end type preserves accumulated content and cleanup, memory/history/compaction/skill/external consumers accept exact canonical input only, and AutoByteus/Claude/Codex actual ingress constructs only authoritative exact-turn source facts. Codex coverage separately enters the real client/router -> `CodexThread` -> notification-handler -> listener -> converter path and parameterizes the exact governed names `item/started`, `item/agentMessage/delta`, `item/completed`, and `item/reasoning/completed`, plus every explicit field location/agreement, blank/non-string, conflict, and inactive state. Every other current non-segment item and non-item event preserves its established operation-owned path without invoking the resolver, and only the thread's opaque branded message can enter the handler/listener/converter. No unknown/future item case or exemption registry is tested. Rejected MCP/non-MCP start/completion leaves pending state unchanged, emits no local/original/AgentRun/Team/standalone/browser event, mutates no reasoning/lifecycle state, writes no raw/debug payload, and produces one four-key sanitized record; admitted MCP/non-MCP and admitted raw-debug controls preserve established behavior. A separate admitted exact-turn lifecycle violation produces the sole visible non-terminal `TURN_DIAGNOSTIC`; runtime/diagnostic rejects. The normal live row must not manufacture malformed input merely to satisfy either negative seam.

Deterministic API/E2E coverage remains responsible for exact negative cases, migration failures, UI state, and exhaustive field-removal assertions. The live matrix is additive evidence that the same contract survives real provider tool/prompt lifecycles.

## 7. Evidence And Result Classification

The execution coverage report must contain one row per runtime with:

- package import source kind and staged-package content digest;
- created root TeamRun ID and relevant task TeamRun/AgentRun IDs;
- runtime kind, exact model identifier, and effective non-secret model configuration;
- canonical address and execution-address observations;
- intrinsic tool exposure and provider instruction evidence;
- handoff-result shape, message delivery, task lifecycle, initial-status binding observations, pre-run status/replacement observations, and terminate/restore outcomes;
- provider-source versus canonical segment observations, including explicit start, untyped source content/end, canonical enriched type, complete consumer proof references, browser/application result, and absence of protocol rejection/defaulting/unexpected diagnostic;
- command/test identifier, timestamps, duration, and exit/result classification; and
- redacted log/evidence paths.

Overall live-matrix status is `Pass` only when all three required rows pass. A provider not configured, credential missing, model absent, rate-limited run, runtime spawn failure, or scenario timeout must be reported truthfully as `Blocked` or `Fail` with retained diagnostics; it must not be converted to a skip-based pass.

## 8. Cleanup And Forbidden Shortcuts

Required cleanup:

- before any new live run, remove only the API/E2E-owned disposable journal identified by CR-F-043, correct the prior cleanup evidence, and repeat the protected-target audit; solution/implementation reviewers do not inspect or delete it;
- terminate every root/task run and provider process started by the scenario;
- remove the staged package, isolated application-data root, and isolated database after evidence capture unless failure preservation is explicitly needed;
- if failure state is retained, record its path and redact/copy only non-secret evidence; and
- verify the original agents package and the user's normal AutoByteus server-data state are unchanged.

Forbidden shortcuts:

- reading or logging secret values;
- importing secrets into the user's normal operational database;
- editing the source agents package;
- reusing one provider's result as evidence for another runtime;
- calling private service constructors instead of importing and launching through supported surfaces;
- replacing live rows with adapter mocks;
- fabricating `segment_type` on provider-source content/end or bypassing AgentRun lifecycle while claiming provider-boundary coverage;
- treating a deliberate provider-turn rejection or exact-turn lifecycle-diagnostic seam as live-provider evidence, admitting runtime/diagnostic, or accepting turn-diagnostic terminalization/evidence loss in deterministic coverage;
- weakening the Codex model or reasoning effort from `gpt-5.6-luna` / `medium`;
- using a non-Luna AutoByteus model; or
- reporting unavailable or skipped live coverage as passed.
