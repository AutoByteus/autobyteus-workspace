# API/E2E Revision Record — autobyteus-278 (Remote delegated runs in the run tree)

| Revision | Trigger | Code validated | Investigation round | Result | Durable coverage | Key evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-REV-001 | CRR-002 pass of IR-002 (Large / High) | `1bdcff8ae2` (docs `4abf57451a`) | 1 | **Fail**, 87%. F-001 (High): beta sends an agent frame before `{nodeId}`, so there is no live view of an active remote Agent. F-002 (Medium): REQ-808 affordances are missing in the Team and Org families. F-003 (Medium): C-2, beta's own Stop doesn't end alpha's observation. F-004 (Low, Unclear): the owner mark isn't recorded. Two-server E2E 35/37 (36/37 with the F-001 diagnostic); browser probe 5/6 | the proxy forwards WebSocket upgrades; RC-31 … RC-37 new; RC-20, RC-06, RC-09 … RC-11, RC-22, RC-23 updated; browser probe `remote-runs-in-tree-probe.mjs` (+ script) | `F-001-observation-first-frame-order.log`, `API-01-run2/`, `API-01-diagnostic-nodeid-first/`, `API-02-run9/` | Code reviewer: failure-origin review |
| API-REV-002 | CRR-004 (round 2, held for FU-004 at the code reviewer's request), then CRR-005 (round 3) | `f60f962d9d` (docs `13280c1e62`; server unchanged since `e37ad88b98`) | 2–3 | **Fail**, 91%. F-001 … F-004 resolved. **F-005 (Medium):** in the Team family, opening the remote run while beta is down doesn't open it: no notice, no notice Retry, and a second red row line. Two-server E2E 37/37; the probe passes RTP-01 … RTP-06 (four families, row Retry) and fails RTP-07 in the Team family only (runs 19 and 20) | E2E (round 2, `77d4fd50fe`): hard live, C-2 and Stop checks; RC-31 owner heading and N-405. Probe: four families, the `@` control, RTP-06 per family, RTP-07 new, the tree helper | `API-01-run4/`, `API-02-run19/`, `API-02-run20/` | Code reviewer: failure-origin review of F-005 |
| API-REV-003 | CRR-007 pass of IR-005 (F-005 / CRR F-006) | `580e1cac5b` (docs `59d63920ed`; web only; server unchanged since `e37ad88b98`) | 4 | **Pass**, 95%. F-005 resolved; probe 7/7 twice; E2E run 4 37/37 stands | probe: RTP-07 asserts one red row line | `API-02-run21/`, `API-02-run22/`, `API-01-run4/` | Code reviewer: test-code review |

## API-REV-001 notes

- The diagnostic patched `autobyteus-server-ts/src/api/rest/remote.ts` to hold frames until `{nodeId}` had been sent. It was reverted with `git checkout` and the dist rebuilt; runs 2 and 9 are on the code as delivered.
- E2E run 1 failed four checks on my test's assumptions. Probe runs 1–8 debugged the probe's tree opening and checks. Both are recorded in the progress log.

## API-REV-002 notes

- Round 2 ran on `e37ad88b98`: E2E run 3 passed 37/37, and probe runs 10–13 passed the affordances in three families. The code reviewer then held the full rerun for FU-004 (SR-008). Round 3 reran everything on `f60f962d9d`.
- Probe runs 14–18 debugged my probe, not the product:
  - A down row hides its title (as the spec requires), so a lookup by title missed it.
  - The window asks the node only for an opened root (AC-804), so each root is opened first.
  - Opening a Team run and an Org run collapse each other, so the tree helper opens them deliberately.
  - The row's middle can be its Task link, so rows are opened by the agent's name.
- F-005 shows the same way in runs 19 and 20.
