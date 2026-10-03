# Investigation Notes

## Bootstrap
- Package: auto-approve-default-run-setup
- Git worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup
- Branch: codex/auto-approve-default-run-setup
- Base: refreshed origin/personal, d6f6c7a9ff11f8a3a2f11aabd413de2ef8818b2b
- Finalization target: origin/personal; release/deployment not requested.
- Shared checkout had unrelated changes and was eight commits behind refreshed remote; left untouched.
- Initial user request: auto approval true by default for long unattended runs; Agent/Team run configuration feels daunting compared with Chat workspace/runtime/model controls.
- Screenshot: /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f924582ce27048c297880e4a111134d6/solution_designer_23c8c9e70bf54960a93f63c9036a968c/context_files/ctx_3967092773b4__image.png
- Screenshot is user-supplied visual evidence, not a verified snapshot of this refreshed branch. It shows a tall Team run form with explanatory text, advanced reasoning, workspace mode selection, approval, member overrides and a separate Run Team footer.
- Canonical requirements created Draft before deeper investigation. No approved intended-behavior baseline yet.

## Source Log And Technical Evidence
Sources below are from the refreshed isolated base, not the older shared checkout. Inspection only; no runtime/test execution claimed.
- E-001 — User request and supplied screenshot: long runs may exceed eight hours; forgotten opt-in causes approval work; tall Team form feels intimidating. Screenshot shows advanced reasoning expanded, workspace tabs, help text, member disclosure and separated Run action. Only a diagnostic observation.
- E-002 — `autobyteus-web/composables/useDefinitionLaunchDefaults.ts:123-157`: `buildAgentRunTemplate` and `buildTeamRunTemplate` call new-runtime approval policy with false; Team root inherits that starting value. `defaultLaunchConfig.ts` schema contains runtime/model/llmConfig, not approval.
- E-003 — Same defaults module: `buildEditableAgentRunSeed`, `cloneTeamConfig`, `buildEditableTeamRunSeed` preserve source approval; difference builders retain approval differences. `TeamRunConfig.ts` describes optional team/member approval overrides. `teamRunConfigUtils.ts` handles override presence/equality. These are current structural facts, not independent proof of user intent.
- E-004 — `utils/agentRunRuntimeDraftPolicy.ts`: Antigravity alone is forced true/locked here; other runtimes preserve supplied boolean. Forms use effective runtime policy. New-default change must not be confused with forcing every runtime true.
- E-005 — `stores/chatDraftStore.ts:69-141`: both new context and new draft start true. New Chat defaults temporary workspace and resolves model defaults/last model. `services/chat/chatLaunchService.ts:116,177` submits effective approval for Agent and Team. `components/chat/ChatNewSurface.vue:1-84` foregrounds composer; workspace/approval left footer and model/thinking right footer. `ChatModelMenu.vue` combines model/runtime choice in a contextual menu.
- E-006 — `composables/useRunActions.ts`: supported Agent/Team run preparation seeds templates and clears selection. `components/agents/AgentDetail.vue:189-193`: Agent Run seeds template and navigates to workspace. `stores/agentRunConfigStore.ts`: template seeds shared builder. Mobile launch coordinators also consume Agent/Team templates; inventory found by `rg -n 'setTemplate|showConfig' autobyteus-web -g '*.ts' -g '*.vue' -g '!**/__tests__/**'`.
- E-007 — `components/workspace/config/AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `TeamScopeConfigEditor.vue`, `RunConfigPanel.vue`: vertical settings-first layout, definition presented as disabled-like field, separate runtime/model controls with explanatory text, workspace chooser, approval, Team member disclosure and footer Run action. Latest code already uses quiet controls; advanced model fields are not initially expanded for fresh launches. Do not assume supplied screenshot is identical to current remote code.
- E-008 — `autobyteus-server-ts/src/api/graphql/types/agent-run.ts:38-57`, `agent-team-run.ts:61-99`: GraphQL creation/member/scope input boolean is required, no schema default shown. Backend does not itself render/pop up the form. Visible setup/default mismatch is frontend-supported evidence.
- E-009 — `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md`: colocated tests, workspace TESTING.md governing executable validation; avoid broad staging. No implementation-scoped checks performed by Solution Designer.

## Supported Behavior / Interpretation
SCN-001..005 and BEH-001..005 are canonical in requirements. Supported fresh catalog launches and existing run inspection differ from manually calling internal builders. Direct API omission or corrupt stored payloads are not promoted into product scope.

UX interpretation (inference, not user-tested proof): Chat makes the task primary, shows selected values as small contextual controls, combines runtime/model selection and defers detailed choices. Form emphasizes every field equally, presents internal terminology and helper text immediately, repeats already-selected definition information, and makes setup a separate stage before conversation. Similar data therefore has a different perceived decision burden. Screenshot alone does not prove an exact redesign will solve this.

## Surface / State Inventory
- Payload: AgentRunConfig, TeamRunConfig root/member overrides, new Chat draft, required GraphQL launch approval boolean.
- Existing owners: shared definition launch builders, run stores, runtime policy utility, config forms, Chat draft/launch services.
- Potential impact: local new-template behavior; approval trust policy visible to user. Exact size/risk is N/A before approved design.
- Persistence: saved approval values in existing run configuration/history must remain; volume unknown, no rewrite proposed. No migration investigation/design needed at this phase.
- No API schema, deployment or runtime capability change is requested. Broader UI launch lifecycle changes depend on user direction.

## Runtime / Probe Findings
No application session inspected; no tests or server probes executed. Evidence is source inspection plus user's screenshot/report. Existing test expectations confirm false template intent but are not a user-scenario authority.

## Product Design Context
Request status: Needs clarification. User asks why forms feel complicated and wants simplification but has not explicitly requested Product Team help. Goal: make Agent/Team setup feel as approachable as Chat while retaining workspace/runtime/model choice and advanced member controls. Candidate options require user choice; no Product mode/repository/bootstrap prescribed. No Product artifacts returned.

## Supplemental Inventory
- User screenshot (absolute path above), owner User, diagnostic evidence, BEH-005, no normative approval applicability.
- `requirements-doc.md`, Solution Designer, canonical intended behavior, Approved SR-002.
- `solution-revision-record.md`, Solution Designer, canonical chronological index, current SR-002.
- `solution-designer-result.md`, Solution Designer, current completed design/result context.
- `design-spec.md`, Solution Designer, Ready SR-002. Independent reviews and Product artifacts: N/A — none completed / Product not applicable.

## Unknowns And Risks
- DEC-001: resolved — approved defaults-only scope in USER-APPROVAL-001/002.
- DEC-002/003: explicitly deferred to another ticket; not current blockers.
- RISK-001: default true permits supported tool/access/permission requests without clicking; may permit consequential filesystem/network operations. Existing tool/runtime restrictions are not removed.
- RISK-002: current source and screenshot differ in details; no current rendered comparison was performed.
- Architecture investigation: completed frontend-only owner/path check below; no runtime verification claimed.

## SR-002 — User Approval And Scope Resolution (2026-10-03)
USER-APPROVAL-001: user explicitly requests the small default change first, says form simplification belongs in the next ticket, and specifies that the launch UI should show auto approval true. REQ-001..004/AC-001..004 approved; former UX identifiers deferred, not active. DEC-001 resolved approved, DEC-002/003 deferred/nonblocking. Current Product request: Not stated and explicitly outside this ticket. Canonical requirements now Approved. Prior SR-001 pending status remains historical only. Worktree branch and HEAD verified unchanged; no shared-checkout authoring.

## Current SR-002 Architecture Evidence (after USER-APPROVAL-001)
- Approval refinement: USER-APPROVAL-002 (2026-10-03 current conversation): user confirms this is frontend-only, open fresh launch UI with true, no backend change; reinforces USER-APPROVAL-001 defaults-only scope and deferral of redesign.
- AE-001: re-read `composables/useDefinitionLaunchDefaults.ts` and tests: exactly two fresh-template initial seeds are false; existing Agent/Team seed functions carry source approval untouched. Change belongs at these fresh constructors, not display-only coercion or the runtime policy function.
- AE-002: `stores/agentRunConfigStore.ts:setTemplate`, `stores/teamRunConfigStore.ts:182` consume these builders. Agent form `autoExecuteChecked` binds effective config approval; Team root form uses the same effective config in `TeamScopeConfigEditor.vue`. No form markup change is necessary for on-by-default display.
- AE-003: `stores/agentContextsStore.ts:76-100` copies template through preserved-value editable seed. `stores/agentRunStore.ts:190-201` sends `config.autoExecuteTools` in PrepareAgentRun input on first send. `stores/agentTeamRunStore.ts:457-460` projects root/member launch records and sends createAgentTeamRun input. `utils/teamRunLaunchHierarchy.ts:60-90,200-230` copies root boolean, inherits using nullish coalescing (explicit false survives), and serializes effective booleans. No backend delta required.
- AE-004: tests currently pin old fresh false in `stores/__tests__/agentRunConfigStore.spec.ts:47` and `types/agent/__tests__/TeamRunConfig.spec.ts:33`. Editable seed tests intentionally use saved false; retain these fixtures and add explicit preservation assertions. Runtime-policy specs verify false survives outside forced-on Antigravity; do not flip those tests wholesale.
- AE-005: `TESTING.md` inspected: renderer/store changes need colocated checks plus browser dev-path evidence. Use test-owned data/ports; never the user's live app/data. No tests run by Solution Designer.
- Structural delta: one production file, two input literals; no API/schema/runtime/persistence/concurrency/deployment/ownership change. Trust posture default does change for fresh Agent/Team launches (already available explicitly and default in Chat); conservative security-impact classification High, independent review remains bounded to this approved frontend-only delta.
- Data decision: Not Affected — no schema/reader/writer change or stored config rewrite; normal seeds preserve existing approval. No migration needed or designed.
- Product: Not requested; broader UX postponed. Screenshot is not a normative UI redesign reference.
