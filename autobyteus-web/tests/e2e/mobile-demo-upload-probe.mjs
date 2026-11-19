#!/usr/bin/env node
// The iOS demo's attachment (autobyteus-279; the sweep's upload.mjs, VIS-025): a file attached in the showcase run is
// uploaded, shown on the message and named in the scripted reply, which ends with the closing line.
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openRunNamed, runDemoProbe, sendFromComposer } from './mobile-demo-probe-support.mjs';

const CLOSING = 'This is the demo, so this answer is a sample. With your own computer, your agent does the work and answers here the same way.';
const sample = path.join(mkdtempSync(path.join(os.tmpdir(), 'autobyteus-279-upload-')), 'sample.txt');
writeFileSync(sample, 'Sample notes for the demo upload.\n');

await runDemoProbe('mobile-demo-upload', async (tools) => {
  const { page, sleep, shot, check, expect, text } = tools;
  await openRunNamed(tools, 'Daily Assistant');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Upload files' }).click()]);
  await chooser.setFiles(sample); await sleep(2000);
  await shot('attached'); await check('attached');
  await sendFromComposer(tools, 'Use the attached notes');
  await shot('replied'); await check('replied');
  const after = await text();
  expect('reply', after.includes('I read sample.txt') || after.includes('I read `sample.txt`'), 'the reply names sample.txt');
  expect('closing line', after.includes(CLOSING), 'the reply ends with the closing line');
});
