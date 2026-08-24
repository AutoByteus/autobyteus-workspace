# Remote-Node New-Workspace Team Launch UI/UX Specification

## Status (`Draft`/`Requirements-ready`/`Refined`)

`Approved` — root cause reproduced; approved with `requirements.md` by the user on 2026-08-24.

## UX Goal

Guarantee that the workspace mode/path the user sees is the workspace the Team launch uses, independent of the order in which the user edits other Team settings.

## Related Requirements And Acceptance Criteria

- Requirements: FR-001–FR-007.
- Acceptance criteria: AC-001–AC-009.
- Behaviors: BEH-001–BEH-004.

## Users / Personas / Contexts

- Desktop user in an Electron window bound to a remote/Docker AutoByteus node.
- Browser-equivalent user bound to the same server endpoint.
- User enters an absolute path that exists on the bound server and may continue configuring runtime/model/tool options before launch.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Remote user, `New` path followed by more edits | Temp/Existing is the draft's prior workspace | Configure freely, then launch in entered path | One Team appears under registered path | FR-001–FR-006; AC-001–AC-004 |
| UXJ-002 | Remote user explicitly switches back to Existing/Temp | `New` path is visible | Change launch destination intentionally | Visible and launch state both use chosen existing workspace | FR-001, FR-004; AC-003 |
| UXJ-003 | User opens a different draft or selected run | One draft contains pending `New` path | Avoid cross-draft leakage | New context shows its own workspace state | FR-004; AC-005 |

## Journey Details

### UXJ-001 — Preserve `New` across later edits

1. User selects `New` and enters `/home/autobyteus/workspace/autobyteus-workspace`.
2. User changes any runtime/model/thinking/reasoning/fast-mode/auto-approve/member setting.
3. The `New` tab remains selected and the path remains unchanged.
4. The launch handler retains the same mode/path; it must not silently return to the previous Temp/Existing workspace.
5. On `Run Team`, pending feedback begins, the bound server registers/resolves the path, and the resulting Team appears beneath that workspace.

### UXJ-002 — Explicit destination change

1. User has a visible pending `New` path.
2. User explicitly selects `Existing`, then selects Temp Workspace or another registered workspace.
3. The path input is replaced by the existing-workspace selector and both rendered and launch state change together.
4. `Run Team` launches in that explicitly selected workspace without creating the prior pending path.

### UXJ-003 — Context change

1. User leaves one draft with a pending path and opens another draft or an existing run.
2. The workspace surface rehydrates from the new context or uses its default selection.
3. The prior draft's hidden pending mode/path is not used by the new context.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| Team run configuration panel | Own launch configuration for one draft | Draft selected | Editable, blocked, pending | Launch or select another context |
| Workspace selector | Render and edit authoritative mode/value | Draft editable | Existing, New, validation error, pending/read-only | Change mode/value or launch |
| `Run Team` action | Launch exactly the visible configuration | Current state valid | Ready, pending, blocked | Selected Team view |
| Workspace/team tree | Reveal actual persisted destination | Launch succeeds | Workspace + Team row selected | Normal Team use |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Select `New` | Click/keyboard activate tab | Path input appears | Authoritative mode=`new` | No server request | Enter path |
| Enter path | Type/paste | Input retains text | Authoritative pending path updated | No server request | Edit other settings or launch |
| Edit Team setting after path | Runtime/model/toggle/member edit | Only edited control changes | `New` and path remain unchanged | Workspace state unchanged | Continue or launch |
| Explicitly select `Existing` | Activate tab and choose workspace | Existing selector appears | Authoritative mode/value change together | No `New` registration | Launch in selected workspace |
| Launch valid `New` | Activate `Run Team` | Button disabled/pending; controls read-only | No hidden mode change | Create/resolve workspace, then create Team | Open selected Team |
| Empty/invalid `New` | Activate or readiness evaluation | Existing workspace validation/error appears | No fallback to old workspace | No Team create | Correct input |
| Different draft/run | Select context | Form rehydrates | New context owns its workspace state | No cross-draft carryover | Configure/view context |

## Markdown Wireframes / Visual Structure

```text
Workspace Directory
┌──────────────┬──────────────┐
│   Existing   │   New ✓      │
└──────────────┴──────────────┘
│ /home/autobyteus/workspace/autobyteus-workspace

Auto approve tools                    ON   ← may change

[ Run Team ]

Invariant: changing Auto approve does not alter the selected New mode/path.
```

## Non-Happy-Path States

### Loading

- `Run Team` becomes disabled/read-only for the accepted operation.
- Workspace mode/path cannot change during pending launch.
- Existing pending feedback styling is preserved; no new multi-step progress UI is required.

### Empty

- Empty `New` path keeps launch blocked with the existing `Enter a workspace path to run this team` behavior.
- The app must not treat the prior Temp/Existing workspace as an invisible fallback.

### Error And Recovery

- Workspace registration errors remain at the current workspace error location.
- The same `New` mode/path stays visible after a registration error so the user can correct/retry.
- No additional post-Team-create recovery UI is required by this ticket.

### Disabled / Unavailable

- Existing readiness blockers remain unchanged.
- Pending state disables mode, path, and unrelated Team settings consistently.

### Permission / Authentication

- No new permission behavior. Bound-node transport errors use existing workspace/launch error handling.

## Responsive And Platform Behavior

- Electron and browser-equivalent renderers use the same authoritative workspace state semantics.
- Narrow layouts retain the same `Existing`/`New` tabs and input value; no hover-only status.
- No desktop-host path picker/validation is introduced for remote-node paths.

## Accessibility And Keyboard Behavior

- `Existing` and `New` remain keyboard-operable tabs with accurate `aria-selected` matching launch state.
- Path input value and accessible name remain stable when unrelated controls change.
- `Run Team` remains a native button and exposes disabled/pending state.
- Workspace validation remains visibly rendered with text and an error icon; color is not the only indicator. This ticket does not introduce a new announcement mechanism.

## Content, Labels, And Validation Messages

- Preserve `Workspace Directory`, `Existing`, `New`, and `Run Team` labels.
- Preserve current empty-path message: `Enter a workspace path to run this team.`
- Preserve safe backend workspace-registration detail.
- No new success toast or explanatory copy is required; correct tree placement is the success signal.

## Data And API Dependencies

- Stable Team draft identity.
- Authoritative pending workspace mode plus existing workspace ID or New path.
- Bound-node `CreateWorkspace` canonical identity/root.
- Existing Team create/hydration/context/selection flow.
- Existing live/history navigation projection.

## Out Of Scope

- Redesigning the form/tree, creating directories, adding a progress stepper, or changing Team runtime behavior.
- General launch-error/reconciliation UI unrelated to this state divergence.
- Backend API/schema changes.

## Open Decisions / Risks

- Implementation may choose parent-owned controlled state or another single-owner structure, but must not retain two independently mutable representations.
- Agent-run form usage of the same selector should be reviewed for preserved behavior and covered if the shared correction affects it.

## Approval Status

Approved by the user on 2026-08-24 with the refined `requirements.md` after the deterministic reproduction and root-cause explanation.
