# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/persist-terminal-session-tabs/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/persist-terminal-session-tabs/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/persist-terminal-session-tabs/design-spec.md`
- Rework Note: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/persist-terminal-session-tabs/design-rework-note.md`
- Current Review Round: 3
- Trigger: Round 3 re-review after `solution_designer` resolved AR-D2-001 by choosing clear-cache-on-node/backend-rebind.
- Prior Review Round Reviewed: Round 2 in this same report path.
- Latest Authoritative Round: 3
- Current-State Evidence Basis: Reviewed refined round 3 requirements, investigation notes, design spec, rework note, prior report, current `terminalTarget.ts`, `windowNodeContextStore.ts`, `nodeEndpoints.ts`, and the known partial/stale source edits in `RightSideTabs.vue`, `RightSideTabs.spec.ts`, and `Terminal.vue`.

Round rules:
- Round 1 pass is obsolete because the user refined the requirement from one cached terminal to a per-canonical-target cache.
- Round 2 failed on AR-D2-001; round 3 rechecked that finding before declaring this result.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review for preserving one visible Terminal instance across tab switches | N/A | None | Pass | No | Superseded by refined per-target cache requirement. |
| 2 | Refined design review for per-canonical-target terminal cache | Round 1 had no unresolved findings; obsolete scope rechecked | AR-D2-001 | Fail | No | Node/backend rebinding lifecycle was left as an implementation choice. |
| 3 | Re-review after clear-cache-on-rebind policy was added | AR-D2-001 | None | Pass | Yes | Design now has explicit cache reset spine, requirements, tests, and rejection of old-node preservation. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/persist-terminal-session-tabs/design-spec.md` as the round 3 authoritative design.

Approved architecture shape:

`RightSideTabs.vue -> TerminalPanel.vue / TerminalSessionHost.vue -> Terminal.vue child per canonical target key -> useTerminalSession.ts -> backend terminal route/handler/PTY manager`

Round 3 conclusions:

- `TerminalPanel.vue` / `TerminalSessionHost.vue` is the correct owner for the per-target frontend cache.
- Canonical identity correctly includes node/backend scope plus exactly one terminal mode: normalized root path or explicit server-home.
- `Terminal.vue` explicit `undefined` vs `null` target semantics are sufficient to prevent hidden target drift when TerminalPanel always passes a snapshot target object or explicit `null`.
- Node/backend rebinding is now explicit: TerminalPanel clears all cached entries on `bindingRevision` and/or normalized terminal endpoint scope change; old-node preservation and endpoint-pinned transport are out of scope.
- Backend WebSocket-close -> PTY cleanup remains unchanged and authoritative.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design identifies Bug Fix / Behavior Change and explains the stronger UX requirement after user refinement. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies Missing Invariant / Boundary Or Ownership Issue and cites tab-host unmount, single-current-target replacement, ambiguous `props.target || fallback`, random session IDs, and backend cleanup semantics. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design calls for a targeted frontend refactor: new terminal host/cache owner, key utility extension, single-target `Terminal.vue` cleanup, and node-rebind cache reset. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-007, requirements REQ-013/014, AC-005/010, dependency rules, migration sequence, tests, and rejection log all support the chosen clear-cache-on-rebind policy. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | N/A | Round 1 contained no findings. | Round 1 is superseded by changed requirements. |
| 2 | AR-D2-001 | Medium | Resolved | Requirements add REQ-013/014 and AC-005/010. Design adds DS-007, TerminalPanel rebind watcher ownership, clear-cache migration/test guidance, and rejects old-node preservation / endpoint-pinned transport for this scope. | Resolution matches the recommended scoped policy from round 2. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary target-open: active Terminal tab to correct cached child and backend PTY | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary tab-switch: TerminalPanel hidden without child unmount | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Return/Event: PTY output to same target child xterm | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Bounded local: current target changes while Terminal active | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Bounded local: visible child refit/resize | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Bounded local: true host/component unmount cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Bounded local: node/backend rebinding cache reset | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/layout` | Pass | Pass | Pass | Pass | `RightSideTabs.vue` remains tab visibility/first-open owner and hosts TerminalPanel only. |
| `autobyteus-web/components/workspace/tools` | Pass | Pass | Pass | Pass | New TerminalPanel owns cache and rebind reset; Terminal.vue stays single-target. |
| `autobyteus-web/utils/terminalTarget.ts` | Pass | Pass | Pass | Pass | Canonical key construction belongs with existing target normalization utilities. |
| `windowNodeContextStore.ts` / `nodeEndpoints.ts` | Pass | Pass | Pass | Pass | Existing node binding revision and endpoint derivation are reused as reset/key inputs. |
| `autobyteus-web/composables/useTerminalSession.ts` | Pass | Pass | Pass | Pass | Reuse unchanged is now coherent because rebinding clears old children instead of preserving old-node endpoints. |
| Backend terminal route/handler/manager | Pass | Pass | Pass | Pass | Backend cleanup remains unchanged. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Terminal target key derivation | Pass | Pass | Pass | Pass | A helper in `terminalTarget.ts` avoids duplicate string construction and aligns key identity with rebind scope. |
| Cached terminal entry shape | Pass | Pass | Pass | Pass | Local TerminalPanel type is sufficient for this scope. |
| Lazy stateful tab pattern | Pass | N/A | N/A | Pass | Generic stateful-tab framework is still premature. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TerminalTarget` | Pass | Pass | Pass | N/A | Pass | `rootPath` is identity; `workspaceId` and display name are metadata. |
| Terminal target cache key | Pass | Pass | Pass | N/A | Pass | Node/backend scope + cwd/server-home mode is singular and explicit. |
| Terminal endpoint/node scope | Pass | Pass | Pass | N/A | Pass | Used both in key construction and rebind reset detection. |
| TerminalPanel entry `{ key, target, label? }` | Pass | Pass | Pass | N/A | Pass | `target` is a snapshot object or explicit `null`; never `undefined`. |
| Terminal `active` prop | Pass | Pass | Pass | N/A | Pass | Visibility/refit only; no lifecycle teardown semantics. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Direct `RightSideTabs.vue -> <Terminal />` active-tab `v-if` | Pass | Pass | Pass | Pass | Replace with lazy `TerminalPanel`. |
| Single-current-target Terminal replacement behavior | Pass | Pass | Pass | Pass | Replace with TerminalPanel per-target child cache. |
| Ambiguous `props.target || fallback` in `Terminal.vue` | Pass | Pass | Pass | Pass | Replace with explicit undefined-vs-null semantics. |
| Backend reattach for this bug | Pass | Pass | Pass | Pass | Rejected; frontend in-window cache is the scoped solution. |
| Old-node cached entry preservation | Pass | Pass | Pass | Pass | Rejected; clear cache on rebinding. |
| Stale one-Terminal-cache partial source edits | Pass | Pass | Pass | Pass | Rework note warns implementation to adapt or replace them. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Pass | Pass | N/A | Pass | Tab host only; should not compute target keys or render many terminals. |
| `autobyteus-web/components/workspace/tools/TerminalPanel.vue` | Pass | Pass | Pass | Pass | Correct owner for per-target cache, child visibility, and rebind cache reset. |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Pass | Pass | N/A | Pass | Single-target xterm/WebSocket owner. |
| `autobyteus-web/utils/terminalTarget.ts` | Pass | Pass | Pass | Pass | Correct place for canonical key construction and normalized endpoint scope helper if needed. |
| `TerminalPanel.spec.ts`, `RightSideTabs.spec.ts`, `Terminal.spec.ts` | Pass | Pass | N/A | Pass | Coverage mapping includes node-rebind cache clearing. |
| `autobyteus-web/docs/terminal.md` | Pass | Pass | N/A | Pass | Should document host/cache scope, rebind reset, and cleanup boundary. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `RightSideTabs.vue` | Pass | Pass | Pass | Pass | May render TerminalPanel and pass `active`; no xterm/session/backend calls. |
| `TerminalPanel.vue` | Pass | Pass | Pass | Pass | May read workspace/node context, compute keys, clear cache on rebind, and render Terminal children. |
| `Terminal.vue` | Pass | Pass | Pass | Pass | May use `useTerminalSession`; no multi-target cache. |
| `useTerminalSession.ts` | Pass | Pass | Pass | Pass | Remains one transport owner and does not learn tab/cache policy. |
| Backend route/handler/manager | Pass | Pass | Pass | Pass | Remains cleanup owner after WebSocket close. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `RightSideTabs.vue` tab lifecycle | Pass | Pass | Pass | Pass | Keeps tab active state above TerminalPanel; does not manage terminal entries. |
| `TerminalPanel.vue` cache boundary | Pass | Pass | Pass | Pass | Owns entry map/list, active child selection, and rebind reset. |
| `Terminal.vue` single-target boundary | Pass | Pass | Pass | Pass | Minimal props avoid parent manipulation of xterm/session internals. |
| `useTerminalSession.ts` transport | Pass | Pass | Pass | Pass | Codec/session transport stays encapsulated. |
| Backend terminal WebSocket route/handler | Pass | Pass | Pass | Pass | WebSocket close remains cleanup boundary. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `<TerminalPanel :active="isTerminalTabActive" />` | Pass | Pass | Pass | Low | Pass |
| Terminal target key helper | Pass | Pass | Pass | Low | Pass |
| TerminalPanel node-rebind watcher | Pass | Pass | Pass | Low | Pass |
| `<Terminal :target="entry.target" :active="..." />` | Pass | Pass | Pass | Low | Pass |
| `Terminal.vue` `target` prop after undefined/null fix | Pass | Pass | Pass | Low | Pass |
| `session.connect()` / `session.disconnect()` | Pass | Pass | Pass | Low | Pass |
| `/ws/terminal/:sessionId` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Pass | Pass | Low | Pass | Existing layout owner. |
| `autobyteus-web/components/workspace/tools/TerminalPanel.vue` | Pass | Pass | Low | Pass | Correct terminal UI host location. |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Pass | Pass | Low | Pass | Existing xterm component location. |
| `autobyteus-web/utils/terminalTarget.ts` | Pass | Pass | Low | Pass | Existing target utility owner. |
| Tests/docs paths | Pass | Pass | Low | Pass | Mapped to owning components/docs. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Stateful tab host after first open | Pass | Pass | N/A | Pass | Extends `RightSideTabs.vue` Files pattern. |
| Multi-target terminal cache | Pass | Pass | Pass | Pass | New TerminalPanel is justified. |
| Target root normalization | Pass | Pass | N/A | Pass | Reuse `normalizeWorkspaceRootPath()`. |
| Backend/node endpoint scope | Pass | Pass | N/A | Pass | Reuse node context store and endpoint utilities. |
| Node/backend rebinding cleanup | Pass | Pass | N/A | Pass | TerminalPanel extends existing node context signal with local cache reset policy. |
| Terminal visual fit/resize | Pass | Pass | N/A | Pass | Extend `Terminal.vue`. |
| Terminal transport lifecycle | Pass | Pass | N/A | Pass | Reuse `useTerminalSession.ts` unchanged. |
| Backend PTY cleanup | Pass | Pass | N/A | Pass | Reuse unchanged. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Direct active-tab Terminal `v-if` | No | Pass | Pass | Removed in favor of host. |
| Single cached Terminal only | No | Pass | Pass | Rejected by refined requirement. |
| Backend detached reattach / deterministic frontend reconnect | No | Pass | Pass | Rejected. |
| `null` target fallback behavior | No | Pass | Pass | Rejected; explicit server-home semantics required. |
| Old-node entry preservation / endpoint pinning | No | Pass | Pass | Rejected for this scope; cache clears on rebind. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Target key utility | Pass | Pass | Pass | Pass |
| `TerminalPanel.vue` creation | Pass | Pass | Pass | Pass |
| `RightSideTabs.vue` host switch | Pass | Pass | Pass | Pass |
| `Terminal.vue` active + undefined/null target semantics | Pass | Pass | Pass | Pass |
| Node/backend rebinding cache clear | Pass | Pass | Pass | Pass |
| Tests/docs | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Tab host shape | Yes | Pass | Pass | Pass | Concrete `TerminalPanel` host shape is clear. |
| Per-target children | Yes | Pass | Pass | Pass | Shows multiple keyed Terminal children rather than one mutating child. |
| Target key | Yes | Pass | Pass | Pass | Avoids workspaceId/display-name identity. |
| Server-home target | Yes | Pass | Pass | Pass | Explicit `target={null}` prevents hidden drift. |
| Node/backend rebinding | Yes | Pass | Pass | Pass | Clear-on-rebind example is concrete and avoids endpoint-pinning ambiguity. |
| Backend lifecycle | Yes | Pass | Pass | Pass | Preserves close-on-WebSocket-close cleanup. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Right-panel collapse unmounting `RightSideTabs` | Current code/tests show collapse unmounts RightSideTabs, which will unmount TerminalPanel and close sessions. | Accept as explicit out-of-scope/residual unless product requires collapse persistence; then move host above collapsing boundary or change collapse behavior. | Non-blocking. |
| Many opened target paths accumulate PTYs | Resource cost of per-target live sessions. | Future explicit close/eviction policy if needed. | Non-blocking. |
| Old-node terminal preservation after backend/node rebind | Some users might expect old-node sessions if they switch back. | Out of scope; future endpoint-pinned transport/cache design required. | Non-blocking by explicit decision. |
| Frontend path normalization vs backend canonical filesystem semantics | Symlink/case-sensitive edge cases may differ. | Accept existing frontend normalized root path for UX identity; backend still validates cwd. | Non-blocking. |

## Review Decision

Pass: the refined design is ready for implementation.

## Findings

None.

## Classification

N/A — no actionable architecture findings remain.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- No persistence across full page reload, app restart, backend restart, host destruction, or node/backend rebinding.
- Right-panel collapse may still close sessions because the current layout can unmount `RightSideTabs`; this is explicitly documented as out of scope/follow-up.
- Multiple opened target paths intentionally keep multiple WebSockets/PTYs live until host teardown or node rebind.
- Current worktree source edits are partial/stale from the one-Terminal-cache design and must be adapted or replaced to implement the approved TerminalPanel design.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The design now has clear ownership, key identity, target semantics, cache reset behavior, removal plan, tests, and residual-risk boundaries. Proceed to implementation using the round 3 artifacts.
