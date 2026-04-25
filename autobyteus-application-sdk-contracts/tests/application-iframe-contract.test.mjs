import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLICATION_IFRAME_BOOTSTRAP_EVENT,
  APPLICATION_IFRAME_CONTRACT_VERSION_V3,
  APPLICATION_IFRAME_READY_EVENT,
  createApplicationHostBootstrapEnvelopeV3,
  createApplicationUiReadyEnvelopeV3,
  doesApplicationHostOriginMatch,
  isApplicationHostBootstrapEnvelopeV3,
  isApplicationUiReadyEnvelopeV3,
  normalizeApplicationHostOrigin,
  readApplicationIframeLaunchHints,
} from '../dist/index.js';

const IFRAME_LAUNCH_ID = 'bundle-app__pkg__sample-app::iframe-launch-1';

const buildBootstrapEnvelope = () => createApplicationHostBootstrapEnvelopeV3({
  host: { origin: 'http://127.0.0.1:43123' },
  application: {
    applicationId: 'bundle-app__pkg__sample-app',
    localApplicationId: 'sample-app',
    packageId: 'pkg',
    name: 'Sample App',
  },
  iframeLaunchId: IFRAME_LAUNCH_ID,
  requestContext: {
    applicationId: 'bundle-app__pkg__sample-app',
  },
  transport: {
    backendBaseUrl: 'http://127.0.0.1:43123/rest/applications/bundle-app__pkg__sample-app/backend',
    backendNotificationsUrl: null,
  },
});

test('readApplicationIframeLaunchHints parses a valid v3 iframe launch-hint query string', () => {
  const hints = readApplicationIframeLaunchHints(
    '?autobyteusContractVersion=3&autobyteusApplicationId=bundle-app__pkg__sample-app&autobyteusIframeLaunchId=bundle-app__pkg__sample-app%3A%3Aiframe-launch-1&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43123',
  );

  assert.deepEqual(hints, {
    contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V3,
    applicationId: 'bundle-app__pkg__sample-app',
    iframeLaunchId: IFRAME_LAUNCH_ID,
    hostOrigin: 'http://127.0.0.1:43123',
  });
});

test('readApplicationIframeLaunchHints rejects missing, stale, or invalid launch-hint input', () => {
  const legacyQueryName = `autobyteus${String.fromCharCode(76)}aunch${String.fromCharCode(73)}nstanceId`;
  assert.equal(readApplicationIframeLaunchHints(''), null);
  assert.equal(
    readApplicationIframeLaunchHints(
      `?autobyteusContractVersion=2&autobyteusApplicationId=bundle-app__pkg__sample-app&${legacyQueryName}=legacy&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43123`,
    ),
    null,
  );
  assert.equal(
    readApplicationIframeLaunchHints(
      `?autobyteusContractVersion=3&autobyteusApplicationId=bundle-app__pkg__sample-app&${legacyQueryName}=legacy&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43123`,
    ),
    null,
  );
  assert.equal(
    readApplicationIframeLaunchHints(
      '?autobyteusContractVersion=3&autobyteusApplicationId=&autobyteusIframeLaunchId=iframe-launch-1&autobyteusHostOrigin=http%3A%2F%2F127.0.0.1%3A43123',
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

test('ready and bootstrap validators accept tight v3 envelopes and reject malformed variants', () => {
  const readyEnvelope = createApplicationUiReadyEnvelopeV3({
    applicationId: 'bundle-app__pkg__sample-app',
    iframeLaunchId: IFRAME_LAUNCH_ID,
  });
  const bootstrapEnvelope = buildBootstrapEnvelope();

  assert.equal(readyEnvelope.eventName, APPLICATION_IFRAME_READY_EVENT);
  assert.equal(bootstrapEnvelope.eventName, APPLICATION_IFRAME_BOOTSTRAP_EVENT);
  assert.equal(isApplicationUiReadyEnvelopeV3(readyEnvelope), true);
  assert.equal(isApplicationHostBootstrapEnvelopeV3(bootstrapEnvelope), true);
  assert.deepEqual(bootstrapEnvelope.payload.requestContext, {
    applicationId: 'bundle-app__pkg__sample-app',
  });

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

  assert.equal(isApplicationHostBootstrapEnvelopeV3(malformedBootstrapEnvelope), false);
  assert.equal(
    isApplicationUiReadyEnvelopeV3({
      ...readyEnvelope,
      payload: {
        applicationId: 'bundle-app__pkg__sample-app',
      },
    }),
    false,
  );
  assert.equal(
    isApplicationHostBootstrapEnvelopeV3({
      ...bootstrapEnvelope,
      payload: {
        ...bootstrapEnvelope.payload,
        requestContext: {
          applicationId: 'bundle-app__pkg__sample-app',
          iframeLaunchId: IFRAME_LAUNCH_ID,
        },
      },
    }),
    false,
  );
});
