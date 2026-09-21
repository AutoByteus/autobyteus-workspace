# API-FIND-017 — Selecting a standalone Team while on an AgentOrg route leaves stale Org center content

## Classification and result

- Result: **Fail**
- IDs: `REQ-031`, `AC-026`, `SCN-015`, `DS-025`; `LIVE-003`
- Preliminary origin: **Implementation-owned frontend Local Fix**
- Reproduction: deterministic with both a prior inactive standalone Team and a newly launched active standalone Team
- Stop condition: critical supported normal navigation journey; later `LIVE-004–005` scope was not started

## Environment

- Current reviewed artifact: `05fdb29945856a59afee98f870b1bca33f3c7213`
- Source: `f6da607ebb0264487f335b7110c69ff0c18602eb`
- Production Nuxt build served at `http://127.0.0.1:3589`
- Current built server at `http://127.0.0.1:8589`
- Real persistent AutoByteus Chromium tab
- Real imported four-Agent/two-Team/two-Org package
- Real active Org `aorg_e2e_mixed_org_b42a161089a84f31b6fc294be822871d`
- Real active standalone Team `aorg_e2e_research_squad_7637f2dddfe4440eb9dff830660336c7`

## Exact supported steps

1. Start from the populated unified Workspaces tree.
2. Launch `AORG E2E Mixed Org`, then focus `/concierge`.
3. Launch standalone `AORG E2E Research Squad`; its `/lead` center surface appears normally.
4. From the same unified tree, select the AgentOrg `/concierge`; this direction succeeds and changes the URL to the AgentOrg query route.
5. From that still-mounted tree, select standalone Team `/analyst`.

The same failure also occurs when selecting the prior inactive Team's exact member.

## Expected

`AC-026` requires switching to a standalone Team and back in one continuously mounted hierarchy. `DS-025` says only the center target changes. Selecting Team `/analyst` must therefore show the exact standalone Team member center surface (and must not leave the AgentOrg route query owning the center).

## Observed

- The standalone Team `/analyst` row becomes `aria-selected="true"` and `aria-current="true"`.
- The AgentOrg `/concierge` row and center also remain selected/present.
- URL remains:
  `.../workspace?rootSubjectKind=agent_org&definitionId=aorg-mixed-org&orgRunId=aorg_e2e_mixed_org_b42a161089a84f31b6fc294be822871d&mode=active`
- Center header remains `concierge - E6EB`; Org conversation/system-instruction surface remains visible.
- No GraphQL request, console error, or page error occurs during the correlated click. This is not a backend, stream, fixture, provider, persistence, or timing failure.
- Screenshot shows two simultaneous highlighted targets: standalone Team `analyst` and Org `concierge`, while center remains Concierge.

## Preliminary failure-origin evidence

`WorkspaceStableExecutionRow` correctly emits `activate`; `useWorkspaceHistorySelectionActions` changes the Team selection and emits `run-selected`. `AppLeftPanel.vue:159–162` then returns solely because `route.path === '/workspace'`. AgentOrg active routes also use `/workspace` and distinguish their center target only through query parameters, so the handler does not clear the stale Org query by pushing plain `/workspace`.

This source correlation exactly explains the observed one-direction failure:

- plain Team `/workspace` -> select Org: typed Org action installs the Org query and succeeds;
- Org `/workspace?...rootSubjectKind=agent_org...` -> select Team: shared handler sees the same pathname and returns, leaving stale Org center ownership.

Code Reviewer should confirm origin before rework. No design or requirement gap is asserted; the supported switch direction is explicit.

## Evidence

- `screenshots/LIVE-003-team-selected-center-stale-org.png`
- `history-team-switch-probe.json`
- `probe-history-team-switch.mjs`
- `AppLeftPanel-switch-source-excerpt.txt`
- `post-launch-dom.txt`
- `backend-session.log`

The correlated probe recorded `before === after` at the exact AgentOrg URL, an empty request list, empty console errors, empty page errors, and the stale Concierge body after the Team selection.
