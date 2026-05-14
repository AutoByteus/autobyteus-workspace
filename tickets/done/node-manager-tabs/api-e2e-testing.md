# API/E2E + Executable Validation: Node Manager Tabs

- Ticket: node-manager-tabs
- Date: 2026-05-13
- Stage: 7
- Gate Result: Pass

## Validation Scope

This is a frontend-only UI layout change. No API contract, backend, Electron IPC contract, or Docker command generation changes were made. Executable validation focuses on component behavior, localization/static-literal guards, and browser smoke verification of the settings page.

## Acceptance Criteria Matrix

| Acceptance Criteria ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| AC-001 | Render NodeManager by default and verify Manage Nodes is selected, Add Node controls render, Docker guide absent from default panel. | `NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run components/settings/__tests__/NodeManager.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` | Pass |
| AC-002 | Select Docker Guide tab and verify Docker guide renders while management Add Node controls are hidden. | Same focused component test command; browser smoke at `http://127.0.0.1:3317/settings` with DOM checks. | Pass |
| AC-003 | Existing node management actions remain functional from default tab. | Existing NodeManager tests in same focused command cover add remote node, open node window, full sync, remove remote node, and pairing cleanup. | Pass |
| AC-004 | Docker guide command rendering/copy behavior remains unchanged. | Existing `DockerNodeStartGuideCard.spec.ts` in same focused command. | Pass |
| AC-005 | New tab labels are localized and no raw product literals introduced. | `pnpm --dir autobyteus-web guard:localization-boundary`; `pnpm --dir autobyteus-web audit:localization-literals`. | Pass |

## Spine Coverage Matrix

| Spine ID | Validation Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SP-001 | Default Manage Nodes flow renders actionable node management sections. | NodeManager component tests; browser smoke before Docker tab click. | Pass |
| SP-002 | Docker Guide flow renders existing Docker guide after tab click. | NodeManager component tests; browser smoke after Docker tab click. | Pass |
| SP-003 | Returning/switching tab state is local and store-backed actions remain unchanged. | Component tests exercise actions from default tab; no store implementation diffs. | Pass |

## Executed Commands

```bash
NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run components/settings/__tests__/NodeManager.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts
pnpm --dir autobyteus-web guard:web-boundary
pnpm --dir autobyteus-web guard:localization-boundary
pnpm --dir autobyteus-web audit:localization-literals
```

## Browser Smoke Evidence

- Dev server: `pnpm --dir autobyteus-web exec nuxi dev --host 127.0.0.1 --port 3317`
- Browser target: `http://127.0.0.1:3317/settings`
- Result:
  - Before Docker tab click: `Node Manager`, `Manage Nodes`, and `Docker Guide` labels present; Docker card absent; Add Node button present.
  - After Docker Guide tab click: Docker card present; Docker tab `aria-selected=true`; Add Node button absent.
- Screenshot artifact: `/Users/normy/.autobyteus/browser-artifacts/af8b49-1778673696659.png`

## Gate Decision

All mapped executable acceptance criteria passed. Stage 7 gate is Pass.

## Re-Entry Validation After CR-001 Fix

- Re-run command: `NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run components/settings/__tests__/NodeManager.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts`
  - Result: Pass, 2 files and 10 tests.
- Re-run guards:
  - `pnpm --dir autobyteus-web guard:web-boundary` — Pass.
  - `pnpm --dir autobyteus-web guard:localization-boundary` — Pass.
  - `pnpm --dir autobyteus-web audit:localization-literals` — Pass.
- Re-run browser smoke:
  - Before Docker Guide click: Manage Nodes/Docker Guide labels present, Docker card absent, Add Node button present.
  - After Docker Guide click: Docker tab selected, Docker card present, Add Node button absent.
  - Screenshot artifact: `/Users/normy/.autobyteus/browser-artifacts/e8c927-1778674171570.png`.

Re-entry Stage 7 gate remains Pass.

## Header Layout Refinement Validation

- Focused tests passed again after removing the redundant visible `Node Manager` heading:
  - `NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run components/settings/__tests__/NodeManager.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts`
  - Result: 2 files and 10 tests passed.
- Guards passed again:
  - `pnpm --dir autobyteus-web guard:web-boundary`
  - `pnpm --dir autobyteus-web guard:localization-boundary`
  - `pnpm --dir autobyteus-web audit:localization-literals`
- Browser smoke:
  - Settings → Nodes shows `Manage Nodes` / `Docker Guide` as the top header navigation.
  - No visible `Node Manager` h2 is present.
  - `Manage Nodes` is selected by default and Add Node controls are visible.
  - Screenshot: `/Users/normy/.autobyteus/browser-artifacts/cc7569-1778675815244.png`.
