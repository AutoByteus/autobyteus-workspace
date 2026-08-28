import fs from 'node:fs/promises';
import { chromium } from '/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
try {
  const pages = browser.contexts().flatMap(c => c.pages());
  const page = pages.find(p => p.url().startsWith('http://127.0.0.1:3016/applications/'));
  if (!page) throw new Error('Round 4 application page not found');
  const frame = page.frames().find(f => f.url().includes('/rest/application-bundles/') && f.url().includes('/assets/ui/index.html'));
  if (!frame) throw new Error('Brief Studio iframe not found');
  const text = await frame.locator('body').innerText();
  const record = {
    capturedAt: new Date().toISOString(),
    hostUrl: page.url(),
    frameUrl: frame.url(),
    briefId: 'brief-2263879a-640f-4606-8e92-d01e53a18dd5',
    assertions: {
      selectedBriefVisible: text.includes('API E2E Luna Patch Proof 2026-08-27T21:31Z'),
      statusInReview: /Status in_review/i.test(text),
      draftOutputCountTwo: /DRAFT OUTPUTS\s+2\s+1 final/i.test(text),
      researcherVisible: /researcher\s+Research/i.test(text),
      exactlyOneFinalSummary: /DRAFT OUTPUTS\s+2\s+1 final/i.test(text),
      writerVisible: /writer\s+Final/i.test(text),
      researchPathVisible: text.includes('/brief-studio/research.md'),
      finalPathVisible: text.includes('/brief-studio/final-brief.md'),
      writerMarkerVisible: text.includes('Brief context: {"briefId":"brief-2263879a-640f-4606-8e92-d01e53a18dd5","title":"API E2E Luna Patch Proof 2026-08-27T21:31Z","observedStatus":"researching"}'),
      verbatimFindingVisible: text.includes("- The Brief Studio workflow separates application-routed capabilities from Luna's built-in patch operation, so file creation must be performed by the provider patch tool rather than a configured registry tool."),
    },
    bodyText: text,
  };
  if (Object.values(record.assertions).some(v => v !== true)) throw new Error(`Browser assertion failed: ${JSON.stringify(record.assertions)}`);
  await fs.writeFile('tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-004/final-browser-observation.json', JSON.stringify(record, null, 2));
  console.log(JSON.stringify(record.assertions));
} finally {
  await browser.close();
}
