import fs from 'node:fs/promises';
import { chromium } from '/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const pages = browser.contexts().flatMap(c => c.pages());
  const page = pages.find(p => p.url().startsWith('http://127.0.0.1:3016/applications/'));
  if (!page) throw new Error('Round 5 application page not found');
  const frame = page.frames().find(f => f.url().includes('/rest/application-bundles/') && f.url().includes('/assets/ui/index.html'));
  if (!frame) throw new Error('Brief Studio iframe not found');
  const text = await frame.locator('body').innerText();
  const briefId = 'brief-6e01ee36-3707-416c-9270-9a8e9f8e8838';
  const title = 'API REV 005 CLEAN PRODUCTION PROOF 2026-08-28 11:53 UTC';
  const verbatim = '- A reviewable production proof should connect the API revision to a reproducible request, response, environment, timestamp, and outcome rather than relying on an assertion that the deployment succeeded.';
  const record = {
    capturedAt: new Date().toISOString(), hostUrl: page.url(), frameUrl: frame.url(), briefId,
    assertions: {
      selectedBriefVisible: text.includes(title),
      statusInReview: /Status in_review/i.test(text),
      draftOutputCountTwo: /DRAFT OUTPUTS\s+2\s+1 final/i.test(text),
      researcherVisible: /researcher\s+Research/i.test(text),
      exactlyOneFinalSummary: /DRAFT OUTPUTS\s+2\s+1 final/i.test(text),
      writerVisible: /writer\s+Final/i.test(text),
      researchPathVisible: text.includes('/brief-studio/research.md'),
      finalPathVisible: text.includes('/brief-studio/final-brief.md'),
      writerMarkerVisible: text.includes(`Brief context: {"briefId":"${briefId}","title":"${title}","observedStatus":"researching"}`),
      verbatimFindingVisible: text.includes(verbatim),
    }, bodyText: text,
  };
  await fs.writeFile('tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-005/clean-final-browser-observation.json', JSON.stringify(record, null, 2));
  await page.screenshot({path:'tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-005/clean-final-browser-in-review.png', fullPage:true});
  const frameElement = await frame.frameElement();
  await frameElement.screenshot({path:'tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-005/clean-final-brief-iframe.png'});
  console.log(JSON.stringify(record.assertions, null, 2));
  if (Object.values(record.assertions).some(v => v !== true)) process.exitCode=2;
} finally { await browser.close(); }
