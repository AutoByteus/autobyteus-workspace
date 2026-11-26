# IMP-004: CRR-001 Local Fix, CR-001 (card grids on a phone) and CR-002 (the name beside its places line)

- Commit: `1cf6e23765`, on `51d770dfa9` (API/E2E's round 1 and the failure-origin review).
- Environment: macOS arm64, `env -i`.
- Date: 2026-11-26.
- Result: **Pass.**

## Spec, red then green

`npx vitest run components/memory/__tests__/{AgentMemoryPage,GroupMemoryPage,MemoryBrowse}.spec.ts`

| Run | Result |
|---|---|
| Red: the new cases on `51d770dfa9`'s source | 3 failed (each grid without `grid-cols-1`; the places line without `flex-1 basis-0`), 19 passed |
| Green: `1cf6e23765` | all passed. The whole memory spec folder (`npx vitest run components/memory`): 12 files, 76 tests passed |

## API/E2E's probe, SMV-120 and SMV-121

`node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir <tmp>/smv` (the worktree's built server, as in IMP-002). The result is in `probe-result.json`.

- **Pass, 54/54 checks**, 0 page errors; no dev-server reload in its frontend log.
- **SMV-120:** the name is whole beside "Also works in Product Review Team". At 1440 px it is 153 px wide and needs 153 px; at 1280 px the same.
- **SMV-121:** at 390 px the Episodic cards end at 370 px and 370 px, inside the 390 px window, and the page does not scroll sideways.
- Screenshots:
  - `VIS-004-agent-episodic-1440x900.png`: the name, then the places line, in one header row, as in VIS-004.
  - `SMV-121-agent-episodic-narrow-390x844.png`: the cards inside the window, as in VIS-005.
