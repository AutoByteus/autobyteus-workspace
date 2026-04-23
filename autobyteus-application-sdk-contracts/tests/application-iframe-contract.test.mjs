import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLICATION_IFRAME_BOOTSTRAP_EVENT,
  APPLICATION_IFRAME_CONTRACT_VERSION_V2,
  APPLICATION_IFRAME_READY_EVENT,
  createApplicationHostBootstrapEnvelopeV2,
  createApplicationUiReadyEnvelopeV2,
  doesApplicationHostOriginMatch,
  isApplicationHostBootstrapEnvelopeV2,
  isApplicationUiReadyEnvelopeV2,
  normalizeApplicationHostOrigin,
  readApplicationIframeLaunchHints,
} from '../dist/index.js';

const buildBootstrapEnvelope = () => createApplicationHostBootstrapEnvelopeV2({
  host: { origin: 'http://127.0.0.1:43123' },
  application: {
    applicationId: 'bundle-app__pkg__sample-app',
    localApplicationId: 'sample-app',
    packageId: 'pkg',
    name: 'Sample App',
  },
  launch: {
    launchInstanceId: 'bundle-app__pkg__sample-app::launch-1',
  },
  requestContext: {
    applicationId: 'bundle-app__pkg__sample-app',
    launchInstanceId: 'bundle-app__pkg__sample-app::launch-1',
  },
  transport: {
    backendBaseUrl: 'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__sample-app/backend',
    backendNotificationsUrl: null,
  },
});

test('readApplicationIframeLaunchHints parses a valid launch-hint query string', () => {
  const hints = readApplicationIframeLaunchHints(
    '?autobyteusContractVersion=2&autobyteusApplicationId=bundle-app__pkg__sample-app&autobyteusLaunchInstanceId=bundle-app__pkg__sample-app%3A%3Alaunch-1&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43123',
  );

  assert.deepEqual(hints, {
    contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V2,
    applicationId: 'bundle-app__pkg__sample-app',
    launchInstanceId: 'bundle-app__pkg__sample-app::launch-1',
    hostOrigin: 'http://127.0.0.1:43123',
  });
});

test('readApplicationIframeLaunchHints rejects missing or invalid launch-hint input', () => {
  assert.equal(readApplicationIframeLaunchHints(''), null);
  assert.equal(
    readApplicationIframeLaunchHints(
      '?autobyteusContractVersion=1&autobyteusApplicationId=bundle-app__pkg__sample-app',
    ),
    null,
  );
  assert.equal(
    readApplicationIframeLaunchHints(
      '?autobyteusContractVersion=2&autobyteusApplicationId=&autobyteusLaunchInstanceId=launch-1&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43123',
    ),
    null,
  );
});

test('packaged host-origin normalization preserves the file/null equivalence rule', () => {
  const packagedOrigin = normalizeApplicationHostOrigin('null', 'file:');

  assert.equal(packagedOrigin, 'file://');
  assert.equal(doesApplicationHostOriginMatch(packagedOrigin, 'null'), true);
  assert.equal(doesApplicationHostOriginMatch(packagedOrigin, 'file://'), true);
  assert.equal(doesApplicationHostOriginMatch(packagedOrigin, 'http://127.0.0.1:43123'), false);
});

test('ready and bootstrap validators accept tight envelopes and reject malformed variants', () => {
  const readyEnvelope = createApplicationUiReadyEnvelopeV2({
    applicationId: 'bundle-app__pkg__sample-app',
    launchInstanceId: 'bundle-app__pkg__sample-app::launch-1',
  });
  const bootstrapEnvelope = buildBootstrapEnvelope();

  assert.equal(readyEnvelope.eventName, APPLICATION_IFRAME_READY_EVENT);
  assert.equal(bootstrapEnvelope.eventName, APPLICATION_IFRAME_BOOTSTRAP_EVENT);
  assert.equal(isApplicationUiReadyEnvelopeV2(readyEnvelope), true);
  assert.equal(isApplicationHostBootstrapEnvelopeV2(bootstrapEnvelope), true);

  const malformedBootstrapEnvelope = {
    ...bootstrapEnvelope,
    payload: {
      ...bootstrapEnvelope.payload,
      transport: {
        backendBaseUrl: 42,
        backendNotificationsUrl: null,
      },
    },
  };

  assert.equal(isApplicationHostBootstrapEnvelopeV2(malformedBootstrapEnvelope), false);
  assert.equal(
    isApplicationUiReadyEnvelopeV2({
      ...readyEnvelope,
      payload: {
        applicationId: 'bundle-app__pkg__sample-app',
      },
    }),
    false,
  );
});
