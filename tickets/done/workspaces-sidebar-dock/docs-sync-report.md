# Docs Sync Report — workspaces-sidebar-dock

## Scope
- Trigger: API-REV-001 Pass (95%); Medium / Low, Direct Low-Risk.
- Bootstrap base: `d9bccf2550b918ab138e30486ef4dbf1d5e9d1ff`.
- Integrated base: fetched `origin/personal` at `e22245f097c208e66065302cfc30814cc5ffd14f`; merge `4127815cd5383e055ff430674691e59f47742238`, no conflicts.
- Post-integration evidence: [integration receipt](evidence/delivery/integration-refresh.json), [146 tests](evidence/delivery/integrated-repository.log), [browser 4/4](evidence/delivery/browser-integrated/evidence.json). Delivery edits began after the integrated repository rerun passed.

## Why Docs Were Updated
The old description made measured current flow the shell capacity authority and retained an obsolete 900px fallback example. Future layout work must distinguish retained preference, prospective policy allocation and measured drag/browser consumers; otherwise the same false drawer/scrim can return.

## Long-Lived Docs Reviewed
| Path | Result | Reason / notes |
| --- | --- | --- |
| `autobyteus-web/docs/workspace_layout.md` | Updated | Canonical layout ownership, allocation and regression discovery |
| `DESIGN.md` | No change | Existing bounded-owner/evidence principles still apply |
| `TESTING.md` | No change | Existing browser/native isolation guidance remains accurate; ticket results belong here, not in the global guide |
| `RELEASE.md` | No change | Existing origin/personal no-ff finalization and default no-release rules apply |
| `autobyteus-web/AGENTS.md` | No change | Explicit staging and package testing/release instructions followed; root RELEASE.md takes precedence for finalization |

## Docs Updated / Durable Knowledge Promoted
| Topic | Updated long-lived truth | Source authority |
| --- | --- | --- |
| Raw vs effective width | Provider passes retained `preferredRightPanelWidth`; resolved `rightPanel.preferredWidth` is effective render width | SR-002, implemented policy/provider, IR-001 |
| Candidate capacity | Same allocator governs fit, prospective redock and output; Workspaces reclaims right width without mutating preference | AC-001–003; source and integrated browser |
| Measured flow | Still used for drag start/clamping and BrowserPanel resize, not prospective shell fit | `useRightPanel`, `WorkspaceAdaptiveLayout`, BrowserPanel callers |
| Bounds | Default navigation both-dock capacity 930px user-sized / 1210px automatic; 520px navigation 1130px / 1410px; existing narrow/short rules remain | Policy constants, AC-002/005, integrated browser |
| Regression discovery | Added provider/default-docking unit paths and self-owned browser probe command; browser fixture is not native/data proof | API-REV-001 durable coverage, TESTING.md |

All changes are in `autobyteus-web/docs/workspace_layout.md`. Fixed-current-right fit and measured-effective-as-preferred wiring are replaced, not retained as compatibility paths. Removed the obsolete viewport-specific fallback description; genuine insufficient-capacity drawers remain supported. No unrelated catalog or compact-header redesign.

## Delivery Continuation
Docs sync: **Pass / Updated**. Source evidence is sufficient. DR-001 historically blocked on affected-client disposition, now resolved by R2/SR-003 user-approved source-only acceptance. DR-002 refresh confirms the same checked remote base; no source/design/doc geometry changed. Installed-client facts remain unconfirmed, verification Deferred — user-approved source-only. Continue archive/finalization/cleanup; [current report](release-deployment-report.md) owns actual gate states.
