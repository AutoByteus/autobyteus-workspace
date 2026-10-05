# Design Spec — daily-assistant-display-name

## Solution And Approval Basis
- Current solution revision: `SR-003`.
- Approved requirements: `requirements-doc.md` baseline SR-001, approved per SR-002. Approval references are the user messages quoted there.
- Behavior-defining supplements: none new. The exact approved text is the predecessor v1 prompt (`tickets/done/general-agent-identity/general-agent-prompt.md`, SHA `d410e6f6…`) with the two approved line edits; resulting hash `49ed6e909ef92a470fb8b3fce84f471334cd125ff50adf2f5e6aff60389d07b7`.
- Design status: **Ready**.
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/in-progress/daily-assistant-display-name/investigation-notes.md`.

## Current-State Read
The default Chat agent is a platform-owned built-in. Its identity comes from two production sources:
1. the shipped template `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent.md` (front-matter `name`, prompt), and
2. `BUILT_IN_AGENT_DEFINITIONS` in `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` (`displayName`, used only in bootstrap results/logging).

`BuiltInAgentBootstrapper` rewrites the app-data copy from the template on every startup, and the web reads the name from the GraphQL definition. No production code compares the name string; selection uses the stable id `autobyteus-daily-assistant`. There is no design issue; this is a content/label change.

## Task Size And Architectural Risk (Mandatory)
- Task size: **Small**.
- Size rationale: two production content lines in one template, one registry string, plus aligned assertions in about 10 test files and the wording in about 7 doc/comment files. No logic changes.
- Architectural risk: **Low**.
- Risk rationale: no contract, API, persistence, security, concurrency, deployment or ownership change. The existing startup refresh delivers the change; the id is unchanged; history is not touched (same lifecycle the predecessor package validated).
- Escalation trigger: if any production code is found to depend on the display-name string (beyond display/logging), or the startup refresh does not replace the app-data `agent.md`, stop and return to Solution Designer.

## Architecture Investigation Evidence
- Project design guideline applied: `DESIGN.md` (workspace root); no conflicts.

| Source | Path | Observation | Decision |
| --- | --- | --- | --- |
| grep "General Agent" in src | `built-in-agent-registry.ts:35`, template lines 2/4/7, `collaborator-candidate-policy.ts:63` (comment) | Only content, label and a comment; no logic keyed on the name | Edit content only |
| `git show 8a4177f5b` | predecessor rename commit | Lists every file touched by the earlier rename | Use it as the inventory of tests/docs to align |
| sed + shasum | template with the two approved edits | Diff is exactly lines 2 and 7; SHA `49ed6e90…07b7` | New asserted hash |
| bootstrapper | `built-in-agent-bootstrapper.ts:126` | `displayName` is only reported in the bootstrap result | Registry string change is cosmetic but keeps it consistent |

## Intended Change
Rename the displayed identity back to "Daily Assistant" (front-matter `name`, registry `displayName`, prompt line 7). Keep role, description, tools, skill scope and the rest of the prompt unchanged.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior ID | Kind | REQ / AC | Trigger / Contract | Existing evidence | Change / preserved | Target path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-003 / AC-001, AC-003 | Server startup, then GraphQL agentDefinitions, then web Agents/Chat | investigation notes "Current state" | Name becomes Daily Assistant; same id; no migration | DS-001 |
| BEH-002 | Contract | REQ-002 / AC-002 | Prompt shipped to runtime | template line 7 | Only line 7 changes | DS-001 |
| BEH-003 | System | REQ-004 / AC-004 | Docs/tests | grep inventory | Role/description/tools preserved; wording aligned | N/A |

## Relevant Supplemental Task Artifacts
| Artifact | Purpose | Related | Relationship | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name/tickets/done/general-agent-identity/` | Predecessor package (prompt v1, lifecycle evidence) | REQ-002, REQ-003 | Base text and lifecycle; not edited | Finished, read-only |

## Task Design Health Assessment (Mandatory)
- Change posture: Behavior Change (label).
- Current design issue found: No. Root cause: No Design Issue Found. Refactor needed now: No.
- Evidence: the name exists only as content/label; the owner (template + bootstrapper) is healthy.
- Design response: edit content in place.
- Deferrals: the test file `tests/e2e/agent-definitions/general-agent-identity.e2e.test.ts` keeps its filename (it names the predecessor ticket); only its assertions change. Optional rename is not required.

## Legacy Removal Policy (Mandatory)
No backward compatibility is needed. The old label is simply replaced; no alias, fallback or dual name.

## Persisted Data / State Transition Decision
- Stored subject: app-data `agents/autobyteus-daily-assistant/agent.md` and historical run snapshots (`agentName`).
- Decision: **Directly Usable — No Migration**. The existing startup sync overwrites the platform-owned `agent.md` from the template. Historical snapshots keep their captured name by approved design (REQ-003). The id is unchanged, so references stay valid.

## Data-Flow Spine Inventory
| Spine | Scope | Behavior | Start | End | Owner |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | shipped template | web Agents/Chat display + runtime prompt | `BuiltInAgentBootstrapper` |

`template agent.md -> BuiltInAgentBootstrapper (startup sync) -> app-data agent.md -> AgentDefinition service/GraphQL -> web Agents/Chat; runtime prompt composer`

Unchanged spine; content only. Off-spine concerns, boundaries, interfaces, subsystems, shared structures and folders: **N/A**, because no structure changes.

## Removal / Decommission Plan (Mandatory)
| Item | Why | Replaced by | Scope |
| --- | --- | --- | --- |
| "General Agent" as display name/self-introduction and the v1 hash assertions | Superseded by the approved name | "Daily Assistant" and hash `49ed6e90…07b7` | In This Change |

## Final File Responsibility Mapping (files to change)
Production:
- `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent.md`: line 2 `name: Daily Assistant`; line 7 exactly `You are Daily Assistant, a general-purpose agent for practical tasks and requests.` No other byte changes; result SHA must equal `49ed6e909ef92a470fb8b3fce84f471334cd125ff50adf2f5e6aff60389d07b7`.
- `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts:35`: `displayName: "Daily Assistant"`.
- `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts:63`: comment wording.
- `autobyteus-web/stores/chatDraftStore.ts` (comments at ~122, ~151): wording.

Tests (update name/hash/title assertions; keep the behavior asserted):
- server: `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` (name, `displayName`, hash), `tests/e2e/agent-definitions/general-agent-identity.e2e.test.ts` (`APPROVED_SHA256`, expected name; the "existing data" fixture that models an older captured state may stay as is), `tests/unit/agent-tools/agent-discovery/list-available-agents-tool.test.ts` (fixture name/test titles).
- web: `services/chat/__tests__/chatLaunchService.spec.ts`, `stores/__tests__/chatDraftStore.spec.ts`, `components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts` (`New - Daily Assistant`), `components/workspace/config/__tests__/ExistingRunConfigEditor.workspace.spec.ts`, `components/agents/__tests__/AgentDefinitionForm.spec.ts`, `components/agents/__tests__/AgentList.spec.ts`, `tests/e2e/chat-entry-live-probe.mjs` (name + hash), `tests/e2e/cross-scope-agent-mentions-live-probe.mjs` (comment/message wording).

Docs:
- server `docs/modules/agent_definition.md` (lines ~120–127: display name Daily Assistant, role General Agent; reword the "historical snapshots may still say Daily Assistant" note so it says older snapshots may show the earlier label General Agent), `agent_communication.md:390`, `antigravity_cli_runtime.md:98`.
- web `docs/chat.md` (~26–37, 61, 216: same treatment), `docs/agent_management.md:164–165`, `docs/skills.md:63`.

## Backward-Compatibility Rejection Log (Mandatory)
| Candidate | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| Rewriting historical run `agentName` snapshots | Visual consistency | Rejected (out of scope, REQ-003) | None |
| Keeping both names (alias) | Continuity | Rejected | Single name |

## Change Sequence
1. Edit the template and verify the hash. 2. Edit the registry and comments. 3. Update tests. 4. Update docs. 5. Run focused tests.

## Key Tradeoffs / Risks
- Users on beta.3–beta.5 saw "General Agent" in chat history titles; those stay as captured. This is accepted and documented.
- Grep noise: "General Agent" legitimately remains as the **role** value. Do not blindly replace every occurrence.

## Guidance For Implementation
- Apply only the two approved template edits; verify with `shasum -a 256` and compare against v1 with `diff`.
- Focused checks: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/built-in-agents tests/unit/agent-tools/agent-discovery tests/e2e/agent-definitions/general-agent-identity.e2e.test.ts --no-watch`, then the affected web specs with the web package's vitest runner.
- Follow `TESTING.md` for any broader validation.
