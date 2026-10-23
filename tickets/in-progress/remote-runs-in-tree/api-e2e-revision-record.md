# API/E2E Revision Record — autobyteus-278 (Remote delegated runs in the run tree)

| Revision | Trigger | Code validated | Investigation round | Result | Durable coverage | Key evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-REV-001 | CRR-002 pass of IR-002 (Large / High) | `1bdcff8ae2` (docs `4abf57451a`) | 1 | **Fail**, 87%. F-001 (High): beta sends an agent frame before `{nodeId}`, so there is no live view of an active remote Agent. F-002 (Medium): REQ-808 affordances are missing in the Team and Org families. F-003 (Medium): C-2, beta's own Stop doesn't end alpha's observation. F-004 (Low, Unclear): the owner mark isn't recorded. Two-server E2E 35/37 (36/37 with the F-001 diagnostic); browser probe 5/6 | the proxy forwards WebSocket upgrades; RC-31 … RC-37 new; RC-20, RC-06, RC-09 … RC-11, RC-22, RC-23 updated; browser probe `remote-runs-in-tree-probe.mjs` (+ script) | `F-001-observation-first-frame-order.log`, `API-01-run2/`, `API-01-diagnostic-nodeid-first/`, `API-02-run9/` | Code reviewer: failure-origin review |

## API-REV-001 notes

- The diagnostic patched `autobyteus-server-ts/src/api/rest/remote.ts` to hold frames until `{nodeId}` had been sent. It was reverted with `git checkout` and the dist rebuilt; runs 2 and 9 are on the code as delivered.
- E2E run 1 failed four checks on my test's assumptions. Probe runs 1–8 debugged the probe's tree opening and checks. Both are recorded in the progress log.
