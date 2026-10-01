import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptedInputIdentityKey as key, normalizeAcceptedInputIdentity as normalize } from '../dist/index.js';
test('normalized tagged primary identity never bridges secondary tokens', () => {
  assert.equal(key({ messageId: ' A ', dedupeKey: 'x' }), key({ messageId: 'A', dedupeKey: 'y' }));
  assert.notEqual(key({ messageId: 'A', dedupeKey: 'x' }), key({ messageId: 'B', dedupeKey: 'x' }));
  assert.notEqual(key({ messageId: 'x' }), key({ dedupeKey: 'x' }));
  assert.notEqual(key({ messageId: 'A', dedupeKey: 'x' }), key({ dedupeKey: 'x' }));
  assert.equal(key({ dedupeKey: ' x ' }), key({ dedupeKey: 'x' }));
  assert.notEqual(key({ messageId: 'a' }), key({ messageId: 'A' }));
  assert.deepEqual(normalize({ messageId: 1, dedupeKey: ' ' }), {});
  assert.equal(key({ messageId: null, dedupeKey: {} }), null);
});
