// node --test scripts/desktop-package/release-record.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPublicKey } from 'node:crypto';
import { verifyRecord } from './release-record.mjs';
const fixture = JSON.parse(readFileSync(new URL('../../autobyteus-web/linux-install/contract/fixtures.json', import.meta.url)));
const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100','hex'), Buffer.from(fixture.PublicKey,'base64')]), type:'spki',format:'der' });
for (const c of fixture.Cases) test(c.Name, () => {
  const verify = () => verifyRecord(Buffer.from(c.Record,'base64'),c.Signature,key);
  if (c.Valid) assert.doesNotThrow(verify); else assert.throws(verify);
});
