#!/usr/bin/env python3
"""autobyteus-434 API-12 (API/E2E, temporary, not durable): DR-002's question, does this ticket raise the rate of the
FU-004 race that failed MSP-05?

Writes `<web>/tests/e2e/.tmp-msp05-rate-probe.mjs`: a copy of that worktree's `mobile-shell-probe.mjs` with one more case,
MSP-90, right after MSP-05. MSP-90 repeats MSP-05's last step (a reload of the run entry, then Show older, a tap on the
Approver row, <-, and a tap on the Delivery Team row) N times in the same stack and records per try:
  - opened: the run screen opened on the Team's coordinator within 15 s;
  - race: the phone logged FU-004's `became mounted while it was loading` in that try;
  - the times (ms after the reload starts) of the list showing, of the Team tap, and of every GraphQL read the phone made
    (the background Team open of the first history read is visible as its Team reads).
Run it with `--cases=MSP-01,MSP-15,MSP-02,MSP-03,MSP-04,MSP-05,MSP-90` so the cases before MSP-05 run as in the full probe.

Usage: python3 make-rate-probe.py <worktree> [tries]
"""
import pathlib
import sys

worktree = pathlib.Path(sys.argv[1])
tries = int(sys.argv[2]) if len(sys.argv) > 2 else 25
source = worktree / 'autobyteus-web/tests/e2e/mobile-shell-probe.mjs'
target = source.with_name('.tmp-msp05-rate-probe.mjs')
text = source.read_text()
anchor = "  await runCase('MSP-06', async () => {"
assert text.count(anchor) == 1, 'MSP-06 anchor'
case = f"""  await runCase('MSP-90', async () => {{
    const tries = [];
    for (let index = 0; index < {tries}; index += 1) {{
      const t0 = Date.now();
      const errorsBefore = evidence.browserErrors.length;
      const netBefore = phoneNet.length;
      await page.reload({{ waitUntil: 'domcontentloaded' }});
      await page.locator(`${{sel('mobile-run-tree')}}:visible`).waitFor({{ timeout: 60_000 }});
      const listAt = Date.now() - t0;
      await showOlder(page);
      await page.locator(`${{rowSel(`agent:${{stack.approver}}`)}} ${{sel('mobile-run-open')}}`).click();
      await page.locator(sel('mobile-run-back')).first().click();
      await page.locator(`${{sel('mobile-run-tree')}}:visible`).waitFor({{ timeout: 20_000 }});
      const teamTapAt = Date.now() - t0;
      await page.locator(`${{rowSel(`team:${{stack.delivery}}`)}} ${{sel('mobile-run-open')}}`).click();
      let opened = true;
      try {{ await waitFor('the Team open', async () => {{ const s = await runScreen(page); return s.state === 'open' && s.name === 'lead'; }}, 15_000); }} catch {{ opened = false; }}
      await sleep(1_500);
      const race = evidence.browserErrors.slice(errorsBefore).some(entry => entry.line.includes('became mounted while it was loading'));
      const reads = phoneNet.slice(netBefore).filter(entry => entry.label === 'phone').map(entry => ({{ op: entry.op, at: entry.at - t0 }}));
      tries.push({{ index, opened, race, listAt, teamTapAt, reads }});
      console.log(`[mobile-shell] MSP-90 try ${{index + 1}}: opened=${{opened}} race=${{race}} list=${{listAt}} tap=${{teamTapAt}}`);
    }}
    return {{ tries, failedOpens: tries.filter(t => !t.opened).length, races: tries.filter(t => t.race).length }};
  }});

"""
text = text.replace(anchor, case + anchor)
target.write_text(text)
print(target)
