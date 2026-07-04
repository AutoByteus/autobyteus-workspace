# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-terminal-session-tabs/tickets/done/persist-terminal-session-tabs/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-terminal-session-tabs/tickets/done/persist-terminal-session-tabs/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-terminal-session-tabs/tickets/done/persist-terminal-session-tabs/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-terminal-session-tabs/tickets/done/persist-terminal-session-tabs/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-terminal-session-tabs/tickets/done/persist-terminal-session-tabs/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-terminal-session-tabs/tickets/done/persist-terminal-session-tabs/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass from `code_reviewer` requesting API/E2E coverage investigation and execution for `persist-terminal-session-tabs`.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is an in-window frontend terminal cache owned by `TerminalPanel.vue`. `RightSideTabs.vue` must lazy-mount the panel after first Terminal activation and hide it during ordinary tab switches instead of unmounting it. `TerminalPanel.vue` must keep one `Terminal.vue` child per canonical target key where the key includes node/backend endpoint scope plus exactly one terminal mode: normalized cwd root path or explicit server-home. Entries are created lazily only while Terminal is active, snapshot their target object or explicit `null`, and are cleared on window node binding revision or normalized terminal endpoint scope changes. `Terminal.vue` remains a single-target xterm/WebSocket owner: `active=false` must not disconnect, `active=true` must refit/resize, `target: undefined` may fall back to active workspace metadata, and `target: null` means server-home. Backend WebSocket-close -> PTY cleanup must remain unchanged; no backend reattach, deterministic reconnect, endpoint-pinned old-node retention, compatibility wrapper, or legacy tab-unmount path is allowed.

Implementation handoff `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced, old direct `RightSideTabs -> <Terminal />` active-tab `v-if` behavior was replaced, backend lifecycle and `useTerminalSession` transport behavior remain unchanged, and no backend reattach/old-node preservation path was added. Static inspection during this investigation matched that handoff.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Terminal host stays mounted during ordinary right-side tab switches after first activation | Changed | REQ-001, AC-001/002; design DS-002; implementation handoff `RightSideTabs.vue` update | Retain and run `RightSideTabs.spec.ts` TerminalPanel lazy/persistent coverage. |
| One cached terminal child per canonical node/backend + root/server-home key | Added | REQ-002/003/004/005/007/012; AC-003/004/007; design DS-001/004 | Retain and run `TerminalPanel.spec.ts` cache-key, normalized path, server-home, and target-drift coverage. |
| Hidden cached terminal entries remain mounted/connected and output continues to write to their xterm instance | Changed | REQ-008; AC-002; design DS-003; code keeps children mounted by `v-show` and `Terminal.vue` output callback does not depend on active prop | Retain component coverage for mounted/hidden children and `Terminal.vue` active semantics; no new durable API/E2E coverage needed because no browser E2E harness exists and behavior is at the component lifecycle boundary. |
| Visible reactivation refits xterm and sends resize if connected | Changed | REQ-009; design DS-005 | Retain and run `Terminal.spec.ts` active reactivation fit/resize coverage. |
| True host/component unmount still disconnects WebSocket and backend releases PTY | Preserved | REQ-010/011; AC-008/009; implementation handoff says backend unchanged | Retain and run frontend unmount-disconnect coverage plus backend terminal WebSocket lifecycle e2e/unit coverage. |
| Backend/node rebinding clears all cached entries and creates new-node entries lazily | Added | REQ-013/014; AC-005/010; design DS-007; architecture review round 3 | Retain and run `TerminalPanel.spec.ts` node rebind/cache clear coverage. |
| Server-home target is explicit `null`, not omitted-target fallback | Changed | REQ-005/012; AC-007; design interface rule | Retain and run `TerminalPanel.spec.ts`, `Terminal.spec.ts`, `useTerminalSession.spec.ts`, and backend server-home WebSocket coverage. |
| Backend WebSocket protocol and PTY manager lifecycle | Preserved | REQ-011; AC-009; implementation handoff/backend unchanged | Existing backend integration/e2e/unit coverage remains valid and should be rerun as executable evidence. |
| Right-panel collapse / host destruction persistence | Preserved as out of scope | Requirements out-of-scope and design residual risk | No coverage required for persistence across host destruction; true unmount cleanup remains covered. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts` — TerminalPanel lazy mount and inactive cache after tab switch | TerminalPanel is absent before first Terminal activation, mounted/active when Terminal tab is selected, and remains mounted with `active=false`/`v-show` hidden after switching away. | REQ-001, REQ-006, AC-001, AC-006, DS-002 | Still Valid | Static inspection confirms the test targets the approved replacement for the stale direct `<Terminal v-if>` path. | Run in final web focused suite. |
| `autobyteus-web/components/workspace/tools/__tests__/TerminalPanel.spec.ts` — lazy create, normalized root reuse, separate root entries, server-home/null, node rebind | Asserts lazy entry creation only when active, reuse for same normalized root despite workspace id changes, separate entries for different roots, explicit `null` server-home entry without drift, cache clear/unmount on binding/endpoint changes, and new node scope keys. | REQ-002/003/004/005/006/007/012/013/014; AC-003/004/005/006/007/010; DS-001/004/007 | Still Valid | Directly covers the new cache owner and canonical key semantics. Existing tests are aligned with round 3 design. | Run in final web focused suite. |
| `autobyteus-web/components/workspace/tools/__tests__/Terminal.spec.ts` — single-target terminal lifecycle | Asserts active workspace/default server-home connection, explicit target use, explicit `target:null` server-home semantics, reconnect on target change, active reactivation fit/resize without disconnect, and disconnect only on true unmount. | REQ-005/009/010/012; AC-007/008; DS-005/006 | Still Valid | Covers the single-target boundary used by cached children. Explicit null and active prop behavior are current requirements. | Run in final web focused suite. |
| `autobyteus-web/composables/__tests__/useTerminalSession.spec.ts` | Asserts WebSocket URL construction for explicit cwd, server-home default with no cwd/rootPath params, explicit empty root path behavior, input/resize send, output/error decode, disconnect, and no-root rejection when no server-home default is supplied. | REQ-003/005/011; AC-007/009; transport boundary | Still Valid | Backend transport behavior was intentionally preserved; server-home default now supports explicit `target:null` from Terminal. | Run in final web focused suite. |
| `autobyteus-web/utils/__tests__/terminalTransportCodec.spec.ts` | Asserts terminal input/output byte/base64/UTF-8 codec including split multibyte output chunks. | REQ-008 return output preservation; transport codec boundary | Still Valid | Hidden cached terminals still use the same output decoder/callback path, so codec coverage remains relevant. | Run in final web focused suite. |
| `autobyteus-server-ts/tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts` | Real PTY opens in cwd and server home, invalid cwd rejected before session creation, close and churn release PTYs. | REQ-010/011; AC-008/009; backend cleanup boundary | Still Valid | Backend files unchanged and requirements explicitly preserve close-on-WebSocket-close semantics. | Run in final backend focused suite. |
| `autobyteus-server-ts/tests/integration/terminal/terminal-websocket.integration.test.ts` | Fastify WebSocket integration with fake PTY: input/output/resize, cwd resolution, server-home default, invalid cwd, pending-close cleanup, setup-failure cleanup. | REQ-010/011; AC-008/009; backend route/handler integration | Still Valid | Existing assertions still represent required backend behavior and are not stale. | Run in final backend focused suite. |
| `autobyteus-server-ts/tests/unit/services/terminal/terminal-handler.test.ts` | TerminalHandler message parsing, input/resize forwarding, connect/disconnect, startup error frame and close. | REQ-011; backend terminal handler boundary | Still Valid | Backend handler untouched but cleanup semantics remain a required invariant. | Run in final backend focused suite. |
| `autobyteus-server-ts/tests/unit/services/terminal/pty-session-manager.test.ts` | PTY session create/duplicate/close/close while pending/close by target key/close all/list behavior. | REQ-010/011; AC-009 | Still Valid | Existing PTY manager semantics still represent approved current behavior. | Run in final backend focused suite. |
| `autobyteus-server-ts/tests/integration/terminal/terminal-websocket-wsl.integration.test.ts` | Conditional Windows WSL real terminal echo path. | Platform-specific terminal runtime, not changed by frontend cache | Out Of Scope | Current task did not change WSL-specific terminal backend selection or packaged runtime. Test is skipped outside Windows/WSL and not needed for this change. | Do not run unless platform-specific WSL evidence is requested. |
| `autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs` | Packaged Electron node-pty helper/native module validation. | Packaged runtime/install boundary, not changed | Out Of Scope | No packaging, node-pty binary, or Electron build change occurred. | Do not run for this task. |
| `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` and terminal command segment display tests | Agent input/focused interrupt and historical command segment UI | Not related to right-side TerminalPanel live terminal cache | Out Of Scope | Different terminal-command display surface; no changed behavior in this scope. | No action. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found | N/A | Existing relevant tests either assert current behavior or are out of scope; no stale terminal coverage needs removal. | Code review report found no obsolete test paths; investigation inspection matched. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | Current required behaviors have focused durable coverage in existing/implementation-added component, composable, codec, backend integration/e2e, and backend unit tests. | Requirements and design mapping above. | N/A | No additional repository-resident durable coverage is required in this API/E2E round. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Existing relevant coverage is current. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Focused web Vitest execution using existing repository tests after `nuxt prepare`. | Validates TerminalPanel/RightSideTabs/Terminal/useTerminalSession/codec behavior under Vue/Vitest runtime. | These are existing durable tests; no separate temporary scaffold is needed. |
| TEMP-002 | Focused backend Vitest execution for terminal integration/e2e/unit tests. | Validates real and fake WebSocket/PTTY lifecycle, server-home/cwd, cleanup invariants. | These are existing durable tests; no separate temporary scaffold is needed. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full manual browser/Electron xterm UX with a user-entered long-running command while switching tabs | Repository has no dedicated browser E2E harness for this right-side TerminalPanel flow, and existing component tests cover the lifecycle owner semantics while backend e2e covers actual WebSocket/PTTY behavior. | Low-to-medium residual UI integration risk around real DOM/xterm rendering while hidden; mitigated by `v-show`, active prop tests, and backend e2e. | No escalation for this task. Add browser/Electron E2E in future if the project introduces a stable UI harness for workspace tab flows. |
| Persistence across page reload/app restart/backend restart/right-panel host destruction/node rebinding | Explicitly out of scope; true host destruction is supposed to close sessions and node rebinding clears cache. | Low; this is approved product scope. | None. |
| Windows WSL terminal runtime | Not affected by this frontend cache change and current environment is not a Windows WSL target. | Low for this task. | Run WSL integration only for Windows/WSL-specific terminal runtime changes. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | Requirements/design/handoff/code review agree on current scope; no compatibility-only implementation path observed. | N/A |

## Execution Plan

1. Run `pnpm -C autobyteus-web exec nuxt prepare` to refresh generated Nuxt types in the worktree.
2. Run focused web coverage:
   - `pnpm -C autobyteus-web exec vitest --run components/layout/__tests__/RightSideTabs.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts components/workspace/tools/__tests__/TerminalPanel.spec.ts composables/__tests__/useTerminalSession.spec.ts utils/__tests__/terminalTransportCodec.spec.ts`
3. Run focused backend terminal coverage:
   - `pnpm -C autobyteus-server-ts exec vitest --run tests/integration/terminal/terminal-websocket.integration.test.ts tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts tests/unit/services/terminal/terminal-handler.test.ts tests/unit/services/terminal/pty-session-manager.test.ts`
4. Run `git diff --check`.
5. Record results in the canonical API/E2E execution coverage report. Because no repository-resident durable coverage code is planned to be added, updated, or removed during this stage, a passing result should route to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is current and sufficient for this scoped frontend cache plus preserved backend cleanup behavior. No stale coverage was found. No compatibility wrapper, backend detached session retention, dual-path reconnect, or old-node preservation behavior was observed.
